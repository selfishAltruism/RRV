// libs/analyzeReactComponent.ts
import { parse } from "@babel/parser";
import type {
  File,
  Node,
  JSXElement,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXAttribute,
  JSXExpressionContainer,
  CallExpression,
  Identifier,
  FunctionDeclaration,
  ArrowFunctionExpression,
  ObjectPattern,
  ExportDefaultDeclaration,
  FunctionExpression,
} from "@babel/types";
import { isNode, walk, collectIdentifierNames } from "./astUtils";

export type RenderCategory = "independent" | "render-decision" | "post-render";

export type RenderKind =
  | "useRef"
  | "useState"
  | "globalVariable"
  | "recoil"
  | "zustand"
  | "redux"
  | "useMemo"
  | "useCallback"
  | "useEffect"
  | "useLayoutEffect"
  | "reactQuery"
  | "fetch"
  | "axios";

export interface RenderNode {
  id: string;
  name: string;
  kind: RenderKind;
  category: RenderCategory;
  description?: string;
}

export interface StateNode extends RenderNode {
  kind: "useState" | "recoil" | "zustand" | "redux";
  stateName: string;
  setterName?: string;
}

// 컴포넌트 내부 변수 노드 정의.
export interface VariableNode {
  id: string;
  name: string;
  description?: string;
}

export interface JsxTreeNode {
  id: string;
  name: string;
  children: JsxTreeNode[];
}

export interface StateToJsxEdge {
  stateName: string;
  jsxNodeId: string;
}

export interface RefToJsxEdge {
  refName: string;
  jsxNodeId: string;
}

export interface PropToJsxEdge {
  propName: string;
  jsxNodeId: string;
}

// 변수 의존 관계: fromName → toVariableName
export interface VariableDependencyEdge {
  fromName: string;
  toVariableName: string;
}

// 변수 → JSX 엣지.
export interface VariableToJsxEdge {
  variableName: string;
  jsxNodeId: string;
}

// useEffect 의존성 및 변경 사항 메타 데이터 정의.
export interface EffectMeta {
  effectId: string;
  dependencies: string[];
  writesStates: string[];
  writesRefs: string[];
}

export interface EffectDependencyEdge {
  stateName: string;
  effectId: string;
}

export interface EffectToStateEdge {
  effectId: string;
  stateName: string;
}

export interface EffectToRefEdge {
  effectId: string;
  refName: string;
}

// 외부 호출 → 위로 화살표 처리를 위한 구조 정의.
export interface ExternalCallEdge {
  fromNodeId: string;
  label: string;
}

// 리액트 쿼리, fetch, axios 호출에 대한 메타 정의.
export interface NetworkCallMeta {
  nodeId: string;
  kind: "reactQuery" | "fetch" | "axios";
  name: string;
}

export interface ComponentAnalysis {
  independentNodes: RenderNode[];
  renderDecisionNodes: StateNode[];
  postRenderNodes: RenderNode[];
  jsxTree: JsxTreeNode | null;

  // JSX 관련 엣지.
  stateToJsxEdges: StateToJsxEdge[];
  refToJsxEdges: RefToJsxEdge[];
  propToJsxEdges: PropToJsxEdge[];

  // 변수 관련 노드/엣지.
  variableNodes: VariableNode[];
  variableDependencyEdges: VariableDependencyEdge[];
  variableToJsxEdges: VariableToJsxEdge[];

  // useState 세터 흐름.
  setterFlows: { fromSetter: string; toState: string }[];

  // useEffect 관련 엣지.
  effectMetas: EffectMeta[];
  effectDependencyEdges: EffectDependencyEdge[];
  effectToStateEdges: EffectToStateEdge[];
  effectToRefEdges: EffectToRefEdge[];

  // 외부 호출 화살표 정의.
  externalCallEdges: ExternalCallEdge[];

  // 네트워크 호출 메타 정보.
  networkCalls: NetworkCallMeta[];

  errors: string[];
}

// JSX 트리를 구성하는 함수 정의.
function buildJsxTree(
  rootNode: Node | null,
  idMap: Map<Node, string>,
): JsxTreeNode | null {
  if (!rootNode) {
    return null;
  }

  if (rootNode.type !== "JSXElement" && rootNode.type !== "JSXFragment") {
    return null;
  }

  let counter = 0;
  const createId = () => `jsx-${counter++}`;

  const getNameFromJsx = (
    openingName: JSXIdentifier | JSXMemberExpression | JSXNamespacedName,
  ): string => {
    if (openingName.type === "JSXIdentifier") {
      return openingName.name;
    }
    if (openingName.type === "JSXNamespacedName") {
      const ns = openingName.namespace.name;
      const local = openingName.name.name;
      return `${ns}:${local}`;
    }

    const parts: string[] = [];
    let current: JSXMemberExpression | null = openingName;

    while (current) {
      if (current.property.type === "JSXIdentifier") {
        parts.unshift(current.property.name);
      }
      if (current.object.type === "JSXIdentifier") {
        parts.unshift(current.object.name);
        break;
      }
      if (current.object.type === "JSXMemberExpression") {
        current = current.object;
      } else {
        break;
      }
    }
    return parts.length > 0 ? parts.join(".") : "Unknown";
  };

  const build = (node: Node): JsxTreeNode | null => {
    if (node.type === "JSXElement") {
      const jsxNode = node as JSXElement;
      const opening = jsxNode.openingElement;
      const name = getNameFromJsx(opening.name);
      const id = createId();
      idMap.set(node, id);

      const children: JsxTreeNode[] = [];
      jsxNode.children.forEach((child) => {
        if (isNode(child)) {
          const builtChild = build(child);
          if (builtChild) {
            children.push(builtChild);
          }
        }
      });

      return { id, name, children };
    }

    if (node.type === "JSXFragment") {
      const fragmentNode = node as JSXFragment;
      const id = createId();
      idMap.set(node, id);

      const children: JsxTreeNode[] = [];
      fragmentNode.children.forEach((child) => {
        if (isNode(child)) {
          const builtChild = build(child);
          if (builtChild) {
            children.push(builtChild);
          }
        }
      });

      return { id, name: "Fragment", children };
    }

    return null;
  };

  return build(rootNode);
}

// JSX 내부에서 사용된 식별자를 분석하여 state/ref/props/variable → JSX 엣지 생성.
function analyzeJsxUsages(
  rootNode: Node | null,
  jsxIdMap: Map<Node, string>,
  stateNames: Set<string>,
  refNames: Set<string>,
  propNames: Set<string>,
  variableNames: Set<string>,
): {
  stateToJsxEdges: StateToJsxEdge[];
  refToJsxEdges: RefToJsxEdge[];
  propToJsxEdges: PropToJsxEdge[];
  variableToJsxEdges: VariableToJsxEdge[];
} {
  const stateToJsxEdges: StateToJsxEdge[] = [];
  const refToJsxEdges: RefToJsxEdge[] = [];
  const propToJsxEdges: PropToJsxEdge[] = [];
  const variableToJsxEdges: VariableToJsxEdge[] = [];

  const stateEdgeSet = new Set<string>();
  const refEdgeSet = new Set<string>();
  const propEdgeSet = new Set<string>();
  const variableEdgeSet = new Set<string>();

  if (!rootNode) {
    return {
      stateToJsxEdges,
      refToJsxEdges,
      propToJsxEdges,
      variableToJsxEdges,
    };
  }

  const visitJsxNode = (node: Node): void => {
    if (node.type !== "JSXElement" && node.type !== "JSXFragment") {
      return;
    }

    const jsxId = jsxIdMap.get(node);
    if (!jsxId) {
      return;
    }

    const identifiers = new Set<string>();

    if (node.type === "JSXElement") {
      const jsxNode = node as JSXElement;

      // props 속성 값 내부 식별자 수집.
      jsxNode.openingElement.attributes.forEach((attr) => {
        if (
          attr.type === "JSXAttribute" &&
          attr.value &&
          attr.value.type === "JSXExpressionContainer"
        ) {
          const exprContainer = attr.value as JSXExpressionContainer;
          if (exprContainer.expression && isNode(exprContainer.expression)) {
            collectIdentifierNames(exprContainer.expression).forEach((name) => {
              identifiers.add(name);
            });
          }
        } else if (
          attr.type === "JSXSpreadAttribute" &&
          isNode(attr.argument)
        ) {
          // {...props} 형태의 spread attribute 분석.
          collectIdentifierNames(attr.argument).forEach((name) => {
            identifiers.add(name);
          });
        }
      });

      // 자식 JSXExpressionContainer 내부 식별자 수집.
      jsxNode.children.forEach((child) => {
        if (
          child.type === "JSXExpressionContainer" &&
          isNode(child.expression)
        ) {
          collectIdentifierNames(child.expression).forEach((name) => {
            identifiers.add(name);
          });
        }
      });
    } else if (node.type === "JSXFragment") {
      const frag = node as JSXFragment;
      frag.children.forEach((child) => {
        if (
          child.type === "JSXExpressionContainer" &&
          isNode(child.expression)
        ) {
          collectIdentifierNames(child.expression).forEach((name) => {
            identifiers.add(name);
          });
        }
      });
    }

    identifiers.forEach((name) => {
      if (stateNames.has(name)) {
        const key = `${name}|${jsxId}`;
        if (!stateEdgeSet.has(key)) {
          stateEdgeSet.add(key);
          stateToJsxEdges.push({
            stateName: name,
            jsxNodeId: jsxId,
          });
        }
      }
      if (refNames.has(name)) {
        const key = `${name}|${jsxId}`;
        if (!refEdgeSet.has(key)) {
          refEdgeSet.add(key);
          refToJsxEdges.push({
            refName: name,
            jsxNodeId: jsxId,
          });
        }
      }
      if (propNames.has(name)) {
        const key = `${name}|${jsxId}`;
        if (!propEdgeSet.has(key)) {
          propEdgeSet.add(key);
          propToJsxEdges.push({
            propName: name,
            jsxNodeId: jsxId,
          });
        }
      }
      if (variableNames.has(name)) {
        const key = `${name}|${jsxId}`;
        if (!variableEdgeSet.has(key)) {
          variableEdgeSet.add(key);
          variableToJsxEdges.push({
            variableName: name,
            jsxNodeId: jsxId,
          });
        }
      }
    });
  };

  walk(rootNode, (node) => {
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      visitJsxNode(node);
    }
  });

  return { stateToJsxEdges, refToJsxEdges, propToJsxEdges, variableToJsxEdges };
}

// 메인 컴포넌트 후보를 찾는 유틸 함수 정의.
interface ComponentCandidate {
  name: string;
  fnNode: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression;
  paramPropsNames: Set<string>;
  rootJsx: Node | null;
}

function extractPropsFromParams(params: (Node | undefined)[]): Set<string> {
  const result = new Set<string>();
  if (!params.length) return result;

  const param = params[0];
  if (!param) return result;

  if (param.type === "ObjectPattern") {
    const obj = param as ObjectPattern;
    obj.properties.forEach((prop) => {
      if (prop.type === "ObjectProperty" && prop.key.type === "Identifier") {
        result.add(prop.key.name);
      }
    });
  }

  return result;
}

function findMainComponent(ast: File): ComponentCandidate | null {
  const candidates: ComponentCandidate[] = [];

  const addCandidate = (
    name: string,
    fnNode: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression,
    paramPropsNames: Set<string>,
  ): void => {
    let rootJsx: Node | null = null;

    // 함수 전체를 순회하면서 첫 JSXElement/JSXFragment를 포함하는 return을 찾음.
    walk(fnNode as unknown as Node, (node) => {
      if (
        node.type === "ReturnStatement" &&
        node.argument &&
        isNode(node.argument) &&
        !rootJsx
      ) {
        const arg = node.argument;

        // 1차: argument 자체가 JSX인 경우.
        if (arg.type === "JSXElement" || arg.type === "JSXFragment") {
          rootJsx = arg;
          return;
        }

        // 2차: argument 내부를 다시 순회하면서 JSX 탐색.
        walk(arg as unknown as Node, (inner) => {
          if (
            !rootJsx &&
            (inner.type === "JSXElement" || inner.type === "JSXFragment")
          ) {
            rootJsx = inner;
          }
        });
      }
    });

    if (rootJsx) {
      candidates.push({ name, fnNode, paramPropsNames, rootJsx });
    }
  };

  ast.program.body.forEach((stmt) => {
    // 일반 함수 선언: function Page() {}
    if (stmt.type === "FunctionDeclaration" && stmt.id) {
      const name = stmt.id.name;
      if (!/^[A-Z]/.test(name)) {
        return;
      }
      const paramPropsNames = extractPropsFromParams(
        stmt.params as unknown as Node[],
      );
      addCandidate(name, stmt, paramPropsNames);
    }

    // const Page = () => {}
    if (stmt.type === "VariableDeclaration") {
      stmt.declarations.forEach((decl) => {
        if (
          decl.type === "VariableDeclarator" &&
          decl.id.type === "Identifier" &&
          decl.init &&
          decl.init.type === "ArrowFunctionExpression"
        ) {
          const id = decl.id as Identifier;
          const name = id.name;
          if (!/^[A-Z]/.test(name)) {
            return;
          }

          const arrow = decl.init as ArrowFunctionExpression;
          const paramPropsNames = extractPropsFromParams(
            arrow.params as unknown as Node[],
          );

          addCandidate(name, arrow, paramPropsNames);
        }
      });
    }

    // export default function Page() {} / export default () => {}
    if (stmt.type === "ExportDefaultDeclaration") {
      const exportDecl = stmt as ExportDefaultDeclaration;
      const decl = exportDecl.declaration;

      if (decl.type === "FunctionDeclaration") {
        const fn = decl as FunctionDeclaration;
        const name = fn.id?.name ?? "DefaultExportComponent";
        if (/^[A-Z]/.test(name)) {
          const paramPropsNames = extractPropsFromParams(
            fn.params as unknown as Node[],
          );
          addCandidate(name, fn, paramPropsNames);
        }
      } else if (decl.type === "ArrowFunctionExpression") {
        const arrow = decl as ArrowFunctionExpression;
        const name = "DefaultExportComponent";
        const paramPropsNames = extractPropsFromParams(
          arrow.params as unknown as Node[],
        );
        addCandidate(name, arrow, paramPropsNames);
      } else if (decl.type === "FunctionExpression") {
        const fn = decl as FunctionExpression;
        const name = fn.id?.name ?? "DefaultExportComponent";
        if (/^[A-Z]/.test(name)) {
          const paramPropsNames = extractPropsFromParams(
            fn.params as unknown as Node[],
          );
          addCandidate(name, fn, paramPropsNames);
        }
      }
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  // 우선 첫 번째 후보를 사용.
  return candidates[0];
}

export function analyzeReactComponent(source: string): ComponentAnalysis {
  const errors: string[] = [];
  let ast: File;

  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    }) as File;
  } catch {
    return {
      independentNodes: [],
      renderDecisionNodes: [],
      postRenderNodes: [],
      jsxTree: null,
      stateToJsxEdges: [],
      refToJsxEdges: [],
      propToJsxEdges: [],
      variableNodes: [],
      variableDependencyEdges: [],
      variableToJsxEdges: [],
      setterFlows: [],
      effectMetas: [],
      effectDependencyEdges: [],
      effectToStateEdges: [],
      effectToRefEdges: [],
      externalCallEdges: [],
      networkCalls: [],
      errors: ["코드 파싱 실패. TSX 문법 오류 가능성 있음."],
    };
  }

  const independentNodes: RenderNode[] = [];
  const renderDecisionNodes: StateNode[] = [];
  const postRenderNodes: RenderNode[] = [];

  const variableNodes: VariableNode[] = [];
  const variableDependencyEdges: VariableDependencyEdge[] = [];
  const variableToJsxEdges: VariableToJsxEdge[] = [];

  const setterNameToStateName = new Map<string, string>();
  const stateNames = new Set<string>();
  const refNames = new Set<string>();
  const globalVariableNames = new Set<string>();
  const variableNames = new Set<string>();

  const effectMetas: EffectMeta[] = [];
  const effectDependencyEdges: EffectDependencyEdge[] = [];
  const effectToStateEdges: EffectToStateEdge[] = [];
  const effectToRefEdges: EffectToRefEdge[] = [];

  const setterFlows: { fromSetter: string; toState: string }[] = [];
  const externalCallEdges: ExternalCallEdge[] = [];
  const networkCalls: NetworkCallMeta[] = [];

  const externalFunctionNames = new Set<string>();

  // 최상단 전역 변수 / 외부 함수 수집.
  ast.program.body.forEach((statement) => {
    if (statement.type === "VariableDeclaration") {
      statement.declarations.forEach((declarator) => {
        if (declarator.id.type === "Identifier") {
          independentNodes.push({
            id: `global-${declarator.id.name}`,
            name: declarator.id.name,
            kind: "globalVariable",
            category: "independent",
            description:
              "파일 최상단 전역 변수로 렌더링과 직접적으로 독립적인 값으로 취급함.",
          });
          globalVariableNames.add(declarator.id.name);
        }
      });
    }

    if (statement.type === "FunctionDeclaration" && statement.id) {
      const name = statement.id.name;
      if (!/^[A-Z]/.test(name)) {
        externalFunctionNames.add(name);
      }
    }
  });

  // useState, useRef, react-query, fetch, axios, useEffect 등 분석.
  walk(ast.program as unknown as Node, (node, parent) => {
    if (node.type === "VariableDeclaration") {
      node.declarations.forEach((declarator) => {
        if (
          declarator.type === "VariableDeclarator" &&
          declarator.id.type === "ArrayPattern" &&
          declarator.init &&
          declarator.init.type === "CallExpression" &&
          declarator.init.callee.type === "Identifier"
        ) {
          const call = declarator.init as CallExpression;
          const callee = call.callee as Identifier;
          const calleeName = callee.name;
          const firstElement = declarator.id.elements[0];
          const secondElement = declarator.id.elements[1];

          if (
            calleeName === "useState" &&
            firstElement &&
            secondElement &&
            firstElement.type === "Identifier" &&
            secondElement.type === "Identifier"
          ) {
            const stateName = firstElement.name;
            const setterName = secondElement.name;

            setterNameToStateName.set(setterName, stateName);
            stateNames.add(stateName);

            renderDecisionNodes.push({
              id: `state-${stateName}`,
              name: stateName,
              kind: "useState",
              category: "render-decision",
              stateName,
              setterName,
              description:
                "useState 훅으로 정의된 로컬 상태로 렌더링 결정 요소로 분류함.",
            });
          }
        }

        // useRef 분석(변수명 포함).
        if (
          declarator.type === "VariableDeclarator" &&
          declarator.id.type === "Identifier" &&
          declarator.init &&
          declarator.init.type === "CallExpression" &&
          declarator.init.callee.type === "Identifier" &&
          declarator.init.callee.name === "useRef"
        ) {
          const refId = declarator.id as Identifier;
          refNames.add(refId.name);
          independentNodes.push({
            id: `ref-${refId.name}`,
            name: refId.name,
            kind: "useRef",
            category: "independent",
            description:
              "useRef로 선언된 ref 변수로, 값 변경 시 렌더링을 트리거하지 않는 요소로 분류함.",
          });
        }
      });
    }

    if (node.type === "CallExpression" && node.callee.type === "Identifier") {
      const callee = node.callee as Identifier;
      const calleeName = callee.name;

      // 리액트 쿼리 훅 추적.
      const reactQueryNames = new Set<string>([
        "useQuery",
        "useInfiniteQuery",
        "useMutation",
        "useSuspenseQuery",
        "useSuspenseInfiniteQuery",
      ]);

      if (reactQueryNames.has(calleeName)) {
        const id = `reactQuery-${node.start ?? Math.random()}`;
        postRenderNodes.push({
          id,
          name: calleeName,
          kind: "reactQuery",
          category: "post-render",
          description:
            "react-query 훅으로 서버 상태를 가져오는 비동기 호출을 나타냄.",
        });
        networkCalls.push({
          nodeId: id,
          kind: "reactQuery",
          name: calleeName,
        });
        externalCallEdges.push({
          fromNodeId: id,
          label: calleeName,
        });
      }

      // fetch 추적.
      if (calleeName === "fetch") {
        const id = `fetch-${node.start ?? Math.random()}`;
        postRenderNodes.push({
          id,
          name: "fetch",
          kind: "fetch",
          category: "post-render",
          description: "브라우저 fetch API 호출로 네트워크 요청을 나타냄.",
        });
        networkCalls.push({
          nodeId: id,
          kind: "fetch",
          name: "fetch",
        });
        externalCallEdges.push({
          fromNodeId: id,
          label: "fetch",
        });
      }

      // axios 추적.
      if (calleeName === "axios") {
        const id = `axios-${node.start ?? Math.random()}`;
        postRenderNodes.push({
          id,
          name: "axios",
          kind: "axios",
          category: "post-render",
          description: "axios 인스턴스를 통한 네트워크 요청을 나타냄.",
        });
        networkCalls.push({
          nodeId: id,
          kind: "axios",
          name: "axios",
        });
        externalCallEdges.push({
          fromNodeId: id,
          label: "axios",
        });
      }

      // useMemo, useCallback, useLayoutEffect 등 일반 후속 훅.
      if (calleeName === "useMemo") {
        postRenderNodes.push({
          id: `useMemo-${node.start ?? Math.random()}`,
          name: "useMemo",
          kind: "useMemo",
          category: "post-render",
          description:
            "렌더링 이후 계산 결과를 메모이제이션하는 후속 요소로 분류함.",
        });
      }

      if (calleeName === "useCallback") {
        postRenderNodes.push({
          id: `useCallback-${node.start ?? Math.random()}`,
          name: "useCallback",
          kind: "useCallback",
          category: "post-render",
          description: "콜백 함수를 메모이제이션하는 후속 요소로 분류함.",
        });
      }

      if (calleeName === "useLayoutEffect") {
        postRenderNodes.push({
          id: `useLayoutEffect-${node.start ?? Math.random()}`,
          name: "useLayoutEffect",
          kind: "useLayoutEffect",
          category: "post-render",
          description:
            "레이아웃 계산 이후 동기적으로 실행되는 후속 요소로 분류함.",
        });
      }

      // useEffect는 메타와 함께 별도 처리.
      if (calleeName === "useEffect") {
        const id = `useEffect-${node.start ?? Math.random()}`;

        const effectMeta: EffectMeta = {
          effectId: id,
          dependencies: [],
          writesStates: [],
          writesRefs: [],
        };

        // 의존성 배열 분석.
        if (node.arguments.length >= 2) {
          const depsArg = node.arguments[1];
          if (depsArg && depsArg.type === "ArrayExpression") {
            depsArg.elements.forEach((el) => {
              if (!el || el.type !== "Identifier") {
                return;
              }
              effectMeta.dependencies.push(el.name);
            });
          }
        }

        // 콜백 내부에서 setState, ref 변경 추적.
        if (node.arguments.length >= 1) {
          const fnArg = node.arguments[0];
          if (
            fnArg &&
            (fnArg.type === "ArrowFunctionExpression" ||
              fnArg.type === "FunctionExpression")
          ) {
            const fnNode = fnArg;
            walk(fnNode as unknown as Node, (innerNode) => {
              if (
                innerNode.type === "CallExpression" &&
                innerNode.callee.type === "Identifier"
              ) {
                const setter = innerNode.callee as Identifier;
                const setterName = setter.name;
                const stateName = setterNameToStateName.get(setterName);
                if (stateName) {
                  effectMeta.writesStates.push(stateName);
                }
              }

              if (
                innerNode.type === "AssignmentExpression" &&
                innerNode.left.type === "MemberExpression" &&
                innerNode.left.object.type === "Identifier" &&
                innerNode.left.property.type === "Identifier"
              ) {
                const refName = innerNode.left.object.name;
                const propName = innerNode.left.property.name;
                if (propName === "current" && refNames.has(refName)) {
                  effectMeta.writesRefs.push(refName);
                }
              }
            });
          }
        }

        effectMetas.push(effectMeta);

        postRenderNodes.push({
          id,
          name: "useEffect",
          kind: "useEffect",
          category: "post-render",
          description:
            "렌더링 이후 비동기 작업과 부수 효과를 수행하는 요소로 분류함.",
        });
      }
    }
  });

  // useEffect 메타에서 엣지 생성.
  effectMetas.forEach((meta) => {
    meta.dependencies.forEach((depName) => {
      if (stateNames.has(depName)) {
        effectDependencyEdges.push({
          stateName: depName,
          effectId: meta.effectId,
        });
      }
    });

    meta.writesStates.forEach((stateName) => {
      effectToStateEdges.push({
        effectId: meta.effectId,
        stateName,
      });
    });

    meta.writesRefs.forEach((refName) => {
      effectToRefEdges.push({
        effectId: meta.effectId,
        refName,
      });
    });
  });

  // setState 호출 → 상태 엣지 생성, 외부 함수 호출 기록.
  walk(ast.program as unknown as Node, (node) => {
    if (node.type === "CallExpression" && node.callee.type === "Identifier") {
      const callee = node.callee as Identifier;
      const calleeName = callee.name;

      const stateName = setterNameToStateName.get(calleeName);
      if (stateName) {
        setterFlows.push({
          fromSetter: calleeName,
          toState: stateName,
        });
      }

      if (externalFunctionNames.has(calleeName)) {
        externalCallEdges.push({
          fromNodeId: calleeName,
          label: calleeName,
        });
      }
    }
  });

  // 메인 컴포넌트 및 JSX 분석.
  const mainComponent = findMainComponent(ast);
  let jsxRootNode: Node | null = null;
  let jsxTree: JsxTreeNode | null = null;

  const jsxIdMap = new Map<Node, string>();
  const propNames = mainComponent?.paramPropsNames ?? new Set<string>();

  // 메인 컴포넌트 내부 변수 분석.
  if (mainComponent) {
    interface VariableInitInfo {
      name: string;
      initNode: Node | null;
    }

    const variableInfos: VariableInitInfo[] = [];

    walk(mainComponent.fnNode as unknown as Node, (node, parent) => {
      if (node.type === "VariableDeclaration") {
        node.declarations.forEach((declarator) => {
          if (
            declarator.type === "VariableDeclarator" &&
            declarator.id.type === "Identifier"
          ) {
            const name = declarator.id.name;

            // 함수 표현식(핸들러 등)은 변수 영역에서 제외.
            if (
              declarator.init &&
              (declarator.init.type === "ArrowFunctionExpression" ||
                declarator.init.type === "FunctionExpression")
            ) {
              return;
            }

            const initNode =
              declarator.init && isNode(declarator.init)
                ? (declarator.init as unknown as Node)
                : null;

            variableInfos.push({
              name,
              initNode,
            });
          }
        });
      }
    });

    // 변수 노드 및 이름 등록.
    variableInfos.forEach((info) => {
      variableNames.add(info.name);
      variableNodes.push({
        id: `var-${info.name}`,
        name: info.name,
        description:
          "컴포넌트 내부에서 선언된 변수로, 상태/Ref/전역 값을 가공한 중간 값으로 분류함.",
      });
    });

    // 변수 초기화 식에서 의존성 분석 → fromName → 변수.
    variableInfos.forEach((info) => {
      if (!info.initNode) return;
      const deps = collectIdentifierNames(info.initNode);
      deps.forEach((depName) => {
        if (
          stateNames.has(depName) ||
          refNames.has(depName) ||
          propNames.has(depName) ||
          variableNames.has(depName) ||
          globalVariableNames.has(depName)
        ) {
          variableDependencyEdges.push({
            fromName: depName,
            toVariableName: info.name,
          });
        }
      });
    });
  }

  if (mainComponent) {
    jsxRootNode = mainComponent.rootJsx;
    jsxTree = buildJsxTree(jsxRootNode, jsxIdMap);
  }

  const {
    stateToJsxEdges,
    refToJsxEdges,
    propToJsxEdges,
    variableToJsxEdges: variableToJsxEdgesResult,
  } = analyzeJsxUsages(
    jsxRootNode,
    jsxIdMap,
    stateNames,
    refNames,
    propNames,
    variableNames,
  );

  variableToJsxEdges.push(...variableToJsxEdgesResult);

  return {
    independentNodes,
    renderDecisionNodes,
    postRenderNodes,
    jsxTree,
    stateToJsxEdges,
    refToJsxEdges,
    propToJsxEdges,
    variableNodes,
    variableDependencyEdges,
    variableToJsxEdges,
    setterFlows,
    effectMetas,
    effectDependencyEdges,
    effectToStateEdges,
    effectToRefEdges,
    externalCallEdges,
    networkCalls,
    errors,
  };
}

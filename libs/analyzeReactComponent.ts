import { parse } from "@babel/parser";
import type { File, Node, JSXElement, JSXFragment } from "@babel/types";

export type RenderCategory = "independent" | "render-decision" | "post-render";

export interface RenderNode {
  id: string;
  name: string;
  kind:
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
    | "handler";
  category: RenderCategory;
  description?: string;
}

export interface StateNode extends RenderNode {
  kind: "useState" | "recoil" | "zustand" | "redux";
  stateName: string;
  setterName?: string;
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

export interface SetterFlowEdge {
  from: string;
  to: string;
}

export interface ExternalFunctionEdge {
  from: string;
  to: "external";
}

export interface ComponentAnalysis {
  independentNodes: RenderNode[];
  renderDecisionNodes: StateNode[];
  postRenderNodes: RenderNode[];
  jsxTree: JsxTreeNode | null;
  stateToJsxEdges: StateToJsxEdge[];
  setterFlows: SetterFlowEdge[];
  externalFunctionFlows: ExternalFunctionEdge[];
  errors: string[];
}

function isNode(value: unknown): value is Node {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "type" in value;
}

function walk(
  node: Node,
  visitor: (n: Node, parent: Node | null) => void,
  parent: Node | null = null,
): void {
  visitor(node, parent);

  const record = node as Node & Record<string, unknown>;
  const keys = Object.keys(record);

  keys.forEach((key) => {
    const value = record[key];

    if (Array.isArray(value)) {
      value.forEach((child) => {
        if (isNode(child)) {
          walk(child, visitor, node);
        }
      });
    } else if (isNode(value)) {
      walk(value, visitor, node);
    }
  });
}

function buildJsxTree(rootNode: Node | null): JsxTreeNode | null {
  if (!rootNode) {
    return null;
  }

  if (rootNode.type !== "JSXElement" && rootNode.type !== "JSXFragment") {
    return null;
  }

  let nodeCounter = 0;
  const createId = () => `jsx-${nodeCounter++}`;

  const build = (node: Node): JsxTreeNode | null => {
    if (node.type === "JSXElement") {
      const jsxNode = node as JSXElement;
      const opening = jsxNode.openingElement;

      let name = "Unknown";
      const openingName = opening.name;

      if (openingName.type === "JSXIdentifier") {
        name = openingName.name;
      } else if (openingName.type === "JSXMemberExpression") {
        const parts: string[] = [];
        let current: typeof openingName | null = openingName;

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

        if (parts.length > 0) {
          name = parts.join(".");
        }
      }

      const id = createId();
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

function findJsxNodesUsingIdentifier(
  root: JsxTreeNode | null,
  identifier: string,
): JsxTreeNode[] {
  if (!root) {
    return [];
  }

  const result: JsxTreeNode[] = [];

  const dfs = (node: JsxTreeNode) => {
    if (node.name.includes(identifier)) {
      result.push(node);
    }
    node.children.forEach(dfs);
  };

  dfs(root);
  return result;
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
      setterFlows: [],
      externalFunctionFlows: [],
      errors: ["코드 파싱 실패. TSX 문법 오류 가능성 있음."],
    };
  }

  const independentNodes: RenderNode[] = [];
  const renderDecisionNodes: StateNode[] = [];
  const postRenderNodes: RenderNode[] = [];

  const setterNameToStateName = new Map<string, string>();
  const externalFunctionNames = new Set<string>();

  let mainJsxReturn: Node | null = null;

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

  walk(ast as Node, (node) => {
    if (node.type === "VariableDeclaration") {
      node.declarations.forEach((declarator) => {
        if (
          declarator.type === "VariableDeclarator" &&
          declarator.id.type === "ArrayPattern" &&
          declarator.init &&
          declarator.init.type === "CallExpression" &&
          declarator.init.callee.type === "Identifier"
        ) {
          const calleeName = declarator.init.callee.name;
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
      });
    }

    if (node.type === "CallExpression" && node.callee.type === "Identifier") {
      const name = node.callee.name;

      if (name === "useRef") {
        independentNodes.push({
          id: `useRef-${node.start ?? Math.random()}`,
          name: "useRef",
          kind: "useRef",
          category: "independent",
          description:
            "useRef 훅은 값 변경 시 렌더링을 트리거하지 않는 렌더링 독립 요소로 분류함.",
        });
      }

      if (
        name === "useRecoilState" ||
        name === "useRecoilValue" ||
        name === "useRecoilValueLoadable"
      ) {
        renderDecisionNodes.push({
          id: `recoil-${node.start ?? Math.random()}`,
          name,
          kind: "recoil",
          category: "render-decision",
          stateName: name,
          description:
            "Recoil 계열 훅으로 전역 상태 기반 렌더링 결정 요소로 분류함.",
        });
      }

      if (name === "useSelector" || name === "useStore") {
        renderDecisionNodes.push({
          id: `redux-${node.start ?? Math.random()}`,
          name,
          kind: "redux",
          category: "render-decision",
          stateName: name,
          description:
            "Redux 계열 훅으로 전역 상태 기반 렌더링 결정 요소로 분류함.",
        });
      }

      if (name === "useMemo") {
        postRenderNodes.push({
          id: `useMemo-${node.start ?? Math.random()}`,
          name: "useMemo",
          kind: "useMemo",
          category: "post-render",
          description:
            "렌더링 이후 계산 결과를 메모이제이션하는 후속 요소로 분류함.",
        });
      }

      if (name === "useCallback") {
        postRenderNodes.push({
          id: `useCallback-${node.start ?? Math.random()}`,
          name: "useCallback",
          kind: "useCallback",
          category: "post-render",
          description: "콜백 함수를 메모이제이션하는 후속 요소로 분류함.",
        });
      }

      if (name === "useEffect") {
        postRenderNodes.push({
          id: `useEffect-${node.start ?? Math.random()}`,
          name: "useEffect",
          kind: "useEffect",
          category: "post-render",
          description:
            "렌더링 이후 비동기 작업과 부수효과를 수행하는 후속 요소로 분류함.",
        });
      }

      if (name === "useLayoutEffect") {
        postRenderNodes.push({
          id: `useLayoutEffect-${node.start ?? Math.random()}`,
          name: "useLayoutEffect",
          kind: "useLayoutEffect",
          category: "post-render",
          description:
            "레이아웃 계산 이후 동기적으로 실행되는 후속 요소로 분류함.",
        });
      }
    }

    if (
      node.type === "ReturnStatement" &&
      node.argument &&
      isNode(node.argument) &&
      (node.argument.type === "JSXElement" ||
        node.argument.type === "JSXFragment")
    ) {
      if (!mainJsxReturn) {
        mainJsxReturn = node.argument;
      }
    }
  });

  const jsxTree = buildJsxTree(mainJsxReturn);

  const stateToJsxEdges: StateToJsxEdge[] = [];

  renderDecisionNodes.forEach((stateNode) => {
    const targetStateName = stateNode.stateName;
    const relatedJsxNodes = findJsxNodesUsingIdentifier(
      jsxTree,
      targetStateName,
    );
    relatedJsxNodes.forEach((jsxNode) => {
      stateToJsxEdges.push({
        stateName: targetStateName,
        jsxNodeId: jsxNode.id,
      });
    });
  });

  const setterFlows: SetterFlowEdge[] = [];
  const externalFunctionFlows: ExternalFunctionEdge[] = [];

  walk(ast as Node, (node) => {
    if (node.type === "CallExpression" && node.callee.type === "Identifier") {
      const calleeName = node.callee.name;
      const stateName = setterNameToStateName.get(calleeName);

      if (stateName) {
        setterFlows.push({
          from: calleeName,
          to: stateName,
        });
      }

      if (externalFunctionNames.has(calleeName)) {
        externalFunctionFlows.push({
          from: calleeName,
          to: "external",
        });
      }
    }
  });

  return {
    independentNodes,
    renderDecisionNodes,
    postRenderNodes,
    jsxTree,
    stateToJsxEdges,
    setterFlows,
    externalFunctionFlows,
    errors,
  };
}

// libs/graphModel.ts
import type { ComponentAnalysis, JsxTreeNode } from "./analyzeReactComponent";

export interface GraphNode {
  id: string;
  label: string;
  type: "independent" | "renderDecision" | "variable" | "postRender" | "jsx";
  kind: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  label?: string;
}

export interface GraphColumnsX {
  independent: number;
  renderDecision: number;
  variable: number;
  postRender: number;
  jsx: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  colX: GraphColumnsX;
}

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 800;

const COL_MARGIN = 80;
const COL_GAP = 220;

const ROW_START_Y = 80;
const ROW_GAP = 60;

// JSX 트리 플래턴 유틸리티.
function flattenJsxTree(root: JsxTreeNode | null): {
  nodes: JsxTreeNode[];
  parentEdges: { parentId: string; childId: string }[];
} {
  if (!root) return { nodes: [], parentEdges: [] };

  const nodes: JsxTreeNode[] = [];
  const parentEdges: { parentId: string; childId: string }[] = [];

  const walk = (node: JsxTreeNode, parentId: string | null) => {
    nodes.push(node);
    if (parentId) {
      parentEdges.push({ parentId, childId: node.id });
    }
    node.children.forEach((child) => walk(child, node.id));
  };

  walk(root, null);
  return { nodes, parentEdges };
}

export function buildGraphFromAnalysis(
  analysis: ComponentAnalysis | null,
): GraphLayout {
  if (!analysis) {
    return {
      nodes: [],
      edges: [],
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      colX: {
        independent: COL_MARGIN,
        renderDecision: COL_MARGIN + COL_GAP,
        variable: COL_MARGIN + COL_GAP * 2,
        postRender: COL_MARGIN + COL_GAP * 3,
        jsx: COL_MARGIN + COL_GAP * 4,
      },
    };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const colX: GraphColumnsX = {
    independent: COL_MARGIN,
    renderDecision: COL_MARGIN + COL_GAP,
    variable: COL_MARGIN + COL_GAP * 2,
    postRender: COL_MARGIN + COL_GAP * 3,
    jsx: COL_MARGIN + COL_GAP * 4,
  };

  // 이름 기반 lookup을 위해 map 구성.
  const stateNameToId = new Map<string, string>();
  const refNameToId = new Map<string, string>();
  const globalNameToId = new Map<string, string>();
  const variableNameToId = new Map<string, string>();
  const jsxIdToId = new Map<string, string>(); // jsx node id는 그대로 사용.

  // 1) 렌더링 독립 노드 (전역 / ref 등)
  analysis.independentNodes.forEach((n, idx) => {
    const y = ROW_START_Y + idx * ROW_GAP;
    const node: GraphNode = {
      id: n.id,
      label: n.name,
      type: "independent",
      kind: n.kind,
      x: colX.independent,
      y,
    };
    nodes.push(node);

    if (n.kind === "globalVariable") {
      globalNameToId.set(n.name, n.id);
    }
    if (n.kind === "useRef") {
      refNameToId.set(n.name, n.id);
    }
  });

  const independentMaxY =
    analysis.independentNodes.length > 0
      ? ROW_START_Y + (analysis.independentNodes.length - 1) * ROW_GAP
      : ROW_START_Y;

  // 2) 렌더링 결정 노드 (useState 등)
  const renderDecisionStartY = independentMaxY + ROW_GAP * 2;
  analysis.renderDecisionNodes.forEach((n, idx) => {
    const y = renderDecisionStartY + idx * ROW_GAP;
    const node: GraphNode = {
      id: n.id,
      label: n.name,
      type: "renderDecision",
      kind: n.kind,
      x: colX.renderDecision,
      y,
    };
    nodes.push(node);
    stateNameToId.set(n.stateName, n.id);
  });

  const renderDecisionMaxY =
    analysis.renderDecisionNodes.length > 0
      ? renderDecisionStartY +
        (analysis.renderDecisionNodes.length - 1) * ROW_GAP
      : renderDecisionStartY;

  // 3) 변수 노드 (중간 레인)
  const variableStartY = renderDecisionMaxY + ROW_GAP * 2;
  analysis.variableNodes.forEach((v, idx) => {
    const y = variableStartY + idx * ROW_GAP;
    const node: GraphNode = {
      id: v.id,
      label: v.name,
      type: "variable",
      kind: "variable",
      x: colX.variable,
      y,
    };
    nodes.push(node);
    variableNameToId.set(v.name, v.id);
  });

  const variableMaxY =
    analysis.variableNodes.length > 0
      ? variableStartY + (analysis.variableNodes.length - 1) * ROW_GAP
      : variableStartY;

  // 4) 렌더링 후속 노드 (useEffect, reactQuery 등)
  const postRenderStartY = variableMaxY + ROW_GAP * 2;
  analysis.postRenderNodes.forEach((n, idx) => {
    const y = postRenderStartY + idx * ROW_GAP;
    const node: GraphNode = {
      id: n.id,
      label: n.name,
      type: "postRender",
      kind: n.kind,
      x: colX.postRender,
      y,
    };
    nodes.push(node);
  });

  /* const postRenderMaxY =
    analysis.postRenderNodes.length > 0
      ? postRenderStartY + (analysis.postRenderNodes.length - 1) * ROW_GAP
      : postRenderStartY; */

  // 5) JSX 트리 플래턴 처리
  const { nodes: jsxNodes, parentEdges: jsxParentEdges } = flattenJsxTree(
    analysis.jsxTree,
  );

  const jsxStartY = ROW_START_Y;
  jsxNodes.forEach((jsxNode, idx) => {
    const y = jsxStartY + idx * ROW_GAP;
    const node: GraphNode = {
      id: jsxNode.id,
      label: jsxNode.name,
      type: "jsx",
      kind: "jsx",
      x: colX.jsx,
      y,
    };
    nodes.push(node);
    jsxIdToId.set(jsxNode.id, jsxNode.id);
  });

  // JSX 부모-자식 간 흐름 엣지.
  jsxParentEdges.forEach((pe, index) => {
    edges.push({
      id: `jsx-flow-${index}`,
      from: pe.parentId,
      to: pe.childId,
      kind: "flow",
    });
  });

  // 6) 변수 의존 엣지 (상태/Ref/Prop/전역/변수 → 변수)
  analysis.variableDependencyEdges.forEach((e, index) => {
    const toId = variableNameToId.get(e.toVariableName);
    if (!toId) return;

    const fromName = e.fromName;
    let fromId: string | undefined;
    let kind = "flow";

    if (stateNameToId.has(fromName)) {
      fromId = stateNameToId.get(fromName);
      kind = "stateToVariable";
    } else if (refNameToId.has(fromName)) {
      fromId = refNameToId.get(fromName);
      kind = "refToVariable";
    } else if (variableNameToId.has(fromName)) {
      fromId = variableNameToId.get(fromName);
      kind = "variableToVariable";
    } else if (globalNameToId.has(fromName)) {
      fromId = globalNameToId.get(fromName);
      kind = "globalToVariable";
    } else {
      // props 등 분석이 가능하다면 별도 처리 가능.
      // 지금은 from 노드를 찾지 못하면 생략.
      return;
    }

    if (!fromId) return;

    edges.push({
      id: `var-dep-${index}`,
      from: fromId,
      to: toId,
      kind,
      label: fromName,
    });
  });

  // 7) 변수 → JSX 엣지
  analysis.variableToJsxEdges.forEach((e, index) => {
    const fromId = variableNameToId.get(e.variableName);
    const toId = jsxIdToId.get(e.jsxNodeId);
    if (!fromId || !toId) return;

    edges.push({
      id: `var-jsx-${index}`,
      from: fromId,
      to: toId,
      kind: "variableToJsx",
      label: e.variableName,
    });
  });

  // 8) 상태 → JSX 엣지
  analysis.stateToJsxEdges.forEach((e, index) => {
    const fromId = stateNameToId.get(e.stateName);
    const toId = jsxIdToId.get(e.jsxNodeId);
    if (!fromId || !toId) return;

    edges.push({
      id: `state-jsx-${index}`,
      from: fromId,
      to: toId,
      kind: "stateToJsx",
    });
  });

  // 9) Ref → JSX 엣지
  analysis.refToJsxEdges.forEach((e, index) => {
    const fromId = refNameToId.get(e.refName);
    const toId = jsxIdToId.get(e.jsxNodeId);
    if (!fromId || !toId) return;

    edges.push({
      id: `ref-jsx-${index}`,
      from: fromId,
      to: toId,
      kind: "refToJsx",
    });
  });

  // 10) Prop → JSX 엣지 (Props 노드를 렌더링 결정 레인에 생성해서 연결)
  // propName별로 가상의 prop 노드를 만든다.
  const propNameToId = new Map<string, string>();
  let propIndex = 0;

  const ensurePropNode = (propName: string): string => {
    const existing = propNameToId.get(propName);
    if (existing) return existing;

    const id = `prop-${propName}`;
    const y =
      renderDecisionStartY +
      (analysis.renderDecisionNodes.length + propIndex) * ROW_GAP;

    const node: GraphNode = {
      id,
      label: propName,
      type: "renderDecision",
      kind: "prop",
      x: colX.renderDecision,
      y,
    };
    nodes.push(node);
    propNameToId.set(propName, id);
    propIndex += 1;
    return id;
  };

  analysis.propToJsxEdges.forEach((e, index) => {
    const fromId = ensurePropNode(e.propName);
    const toId = jsxIdToId.get(e.jsxNodeId);
    if (!toId) return;

    edges.push({
      id: `prop-jsx-${index}`,
      from: fromId,
      to: toId,
      kind: "propToJsx",
      label: e.propName,
    });
  });

  // 11) useEffect 관련 엣지 (state ↔ effect, ref)
  const effectIdToNodeId = new Map<string, string>();
  analysis.postRenderNodes.forEach((n) => {
    if (n.kind === "useEffect") {
      effectIdToNodeId.set(n.id, n.id);
    }
  });

  analysis.effectDependencyEdges.forEach((e, index) => {
    const fromId = stateNameToId.get(e.stateName);
    const toId = effectIdToNodeId.get(e.effectId);
    if (!fromId || !toId) return;

    edges.push({
      id: `state-effect-${index}`,
      from: fromId,
      to: toId,
      kind: "stateToEffect",
    });
  });

  analysis.effectToStateEdges.forEach((e, index) => {
    const fromId = effectIdToNodeId.get(e.effectId);
    const toId = stateNameToId.get(e.stateName);
    if (!fromId || !toId) return;

    edges.push({
      id: `effect-state-${index}`,
      from: fromId,
      to: toId,
      kind: "effectToState",
    });
  });

  analysis.effectToRefEdges.forEach((e, index) => {
    const fromId = effectIdToNodeId.get(e.effectId);
    const toId = refNameToId.get(e.refName);
    if (!fromId || !toId) return;

    edges.push({
      id: `effect-ref-${index}`,
      from: fromId,
      to: toId,
      kind: "effectToRef",
    });
  });

  // 12) 세터 → 상태 엣지 (라벨 포함)
  analysis.setterFlows.forEach((f, index) => {
    const toId = stateNameToId.get(f.toState);
    if (!toId) return;

    // 세터에 대한 별도 노드는 만들지 않고, 상태 노드로부터 나가는 라벨 엣지는
    // 이미 JSX 핸들러에서 표현될 가능성이 있으므로,
    // 여기서는 상태 노드를 from, 상태 노드를 to로 두되 라벨로 세터명을 표시.
    edges.push({
      id: `setter-state-${index}`,
      from: toId,
      to: toId,
      kind: "setterToState",
      label: f.fromSetter,
    });
  });

  // 13) 외부 호출 → 위로 향하는 엣지
  analysis.externalCallEdges.forEach((e, index) => {
    // fromNodeId가 실제 노드 id인지, 이름인지 케이스가 섞여 있을 수 있다.
    // 먼저 id로 그대로 찾고, 없으면 label과 matching 시도.
    let fromId = e.fromNodeId;
    const exists = nodes.some((n) => n.id === fromId);
    if (!exists) {
      const byLabel = nodes.find((n) => n.label === e.fromNodeId);
      if (byLabel) {
        fromId = byLabel.id;
      } else {
        return;
      }
    }

    edges.push({
      id: `external-${index}`,
      from: fromId,
      to: fromId,
      kind: "toExternalUp",
      label: e.label,
    });
  });

  const allY = nodes.map((n) => n.y);
  const maxY = allY.length ? Math.max(...allY) : BASE_HEIGHT / 2;
  const height = maxY + ROW_GAP * 2;

  const width =
    colX.jsx + COL_MARGIN > BASE_WIDTH ? colX.jsx + COL_MARGIN : BASE_WIDTH;

  return {
    nodes,
    edges,
    width,
    height,
    colX,
  };
}

// app/page.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  analyzeReactComponent,
  ComponentAnalysis,
  JsxTreeNode,
  StateNode,
  RenderNode,
} from "../libs/analyzeReactComponent";

// 그래프 타입 정의.
type GraphNodeType =
  | "independent"
  | "renderDecision"
  | "postRender"
  | "jsx"
  | "setter"
  | "external";

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: GraphNodeType;
  refId?: string;
}

type EdgeKind = "flow" | "stateToJsx" | "setterToState" | "toExternal";

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
}

// JSX 트리를 평탄화하는 함수 정의.
function flattenJsxTree(root: JsxTreeNode | null): JsxTreeNode[] {
  if (!root) return [];
  const result: JsxTreeNode[] = [];

  const dfs = (node: JsxTreeNode) => {
    result.push(node);
    node.children.forEach(dfs);
  };

  dfs(root);
  return result;
}

// 분석 결과를 SVG 그래프용 노드/엣지로 변환하는 함수 정의.
function buildGraphFromAnalysis(analysis: ComponentAnalysis | null): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  colX: {
    independent: number;
    renderDecision: number;
    postRender: number;
    setter: number;
    jsx: number;
    external: number;
  };
} {
  if (!analysis) {
    return {
      nodes: [],
      edges: [],
      width: 900,
      height: 480,
      colX: {
        independent: 0,
        renderDecision: 0,
        postRender: 0,
        setter: 0,
        jsx: 0,
        external: 0,
      },
    };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const colX = {
    independent: 120,
    renderDecision: 360,
    postRender: 600,
    setter: 480,
    jsx: 840,
    external: 1080,
  };

  let yIndependent = 96;
  let yRenderDecision = 96;
  let yPostRender = 96;
  let ySetter = 96;
  const yJsxBase = 96;

  const stateNameToNodeId = new Map<string, string>();
  const jsxIdToNodeId = new Map<string, string>();
  const setterNameToNodeId = new Map<string, string>();

  // 렌더링 독립 요소 노드 생성.
  analysis.independentNodes.forEach((n: RenderNode) => {
    const node: GraphNode = {
      id: n.id,
      label: n.name,
      x: colX.independent,
      y: yIndependent,
      type: "independent",
    };
    yIndependent += 56;
    nodes.push(node);
  });

  // 렌더링 결정 요소 노드 생성.
  analysis.renderDecisionNodes.forEach((n: StateNode) => {
    const label = n.stateName ?? n.name;
    const node: GraphNode = {
      id: n.id,
      label,
      x: colX.renderDecision,
      y: yRenderDecision,
      type: "renderDecision",
      refId: n.stateName,
    };
    yRenderDecision += 56;
    nodes.push(node);
    if (n.stateName) {
      stateNameToNodeId.set(n.stateName, node.id);
    }
  });

  // 렌더링 후속 요소 노드 생성.
  analysis.postRenderNodes.forEach((n: RenderNode) => {
    const node: GraphNode = {
      id: n.id,
      label: n.kind,
      x: colX.postRender,
      y: yPostRender,
      type: "postRender",
    };
    yPostRender += 56;
    nodes.push(node);
  });

  // JSX 트리 노드 생성.
  const jsxNodes = flattenJsxTree(analysis.jsxTree);
  jsxNodes.forEach((jsx, idx) => {
    const node: GraphNode = {
      id: jsx.id,
      label: jsx.name,
      x: colX.jsx,
      y: yJsxBase + idx * 40,
      type: "jsx",
      refId: jsx.id,
    };
    nodes.push(node);
    jsxIdToNodeId.set(jsx.id, node.id);
  });

  // 상태 → JSX 연결 엣지 생성.
  analysis.stateToJsxEdges.forEach((e, idx) => {
    const stateNodeId = stateNameToNodeId.get(e.stateName);
    const jsxNodeId = jsxIdToNodeId.get(e.jsxNodeId);
    if (!stateNodeId || !jsxNodeId) return;
    edges.push({
      id: `stateToJsx-${idx}`,
      from: stateNodeId,
      to: jsxNodeId,
      kind: "stateToJsx",
    });
  });

  // setter 노드 및 상태 변경 엣지 생성.
  analysis.setterFlows.forEach((flow, idx) => {
    const exists = setterNameToNodeId.get(flow.from);
    let setterNodeId = exists;
    if (!setterNodeId) {
      const node: GraphNode = {
        id: `setter-${flow.from}`,
        label: flow.from,
        x: colX.setter,
        y: ySetter,
        type: "setter",
      };
      ySetter += 40;
      nodes.push(node);
      setterNodeId = node.id;
      setterNameToNodeId.set(flow.from, setterNodeId);
    }

    const stateNodeId = stateNameToNodeId.get(flow.to);
    if (!stateNodeId) return;

    edges.push({
      id: `setterToState-${idx}`,
      from: setterNodeId,
      to: stateNodeId,
      kind: "setterToState",
    });
  });

  // 외부 함수 방향 엣지 및 노드 생성.
  if (analysis.externalFunctionFlows.length > 0) {
    const externalSink: GraphNode = {
      id: "external-sink",
      label: "외부.",
      x: colX.external,
      y: 96,
      type: "external",
    };
    nodes.push(externalSink);

    analysis.externalFunctionFlows.forEach((flow, idx) => {
      const exists = setterNameToNodeId.get(flow.from);
      let funcNodeId = exists;
      if (!funcNodeId) {
        const node: GraphNode = {
          id: `external-func-${flow.from}`,
          label: flow.from,
          x: colX.postRender,
          y: yPostRender,
          type: "postRender",
        };
        yPostRender += 40;
        nodes.push(node);
        funcNodeId = node.id;
        setterNameToNodeId.set(flow.from, funcNodeId);
      }

      edges.push({
        id: `toExternal-${idx}`,
        from: funcNodeId,
        to: externalSink.id,
        kind: "toExternal",
      });
    });
  }

  // 기본 렌더링 흐름 선 생성(독립 → 결정 → 후속 → JSX).
  const firstIndependent = nodes.find((n) => n.type === "independent");
  const firstRenderDecision = nodes.find((n) => n.type === "renderDecision");
  const firstPostRender = nodes.find((n) => n.type === "postRender");
  const firstJsx = nodes.find((n) => n.type === "jsx");

  if (firstIndependent && firstRenderDecision) {
    edges.push({
      id: "flow-indep-to-decision",
      from: firstIndependent.id,
      to: firstRenderDecision.id,
      kind: "flow",
    });
  }
  if (firstRenderDecision && firstPostRender) {
    edges.push({
      id: "flow-decision-to-post",
      from: firstRenderDecision.id,
      to: firstPostRender.id,
      kind: "flow",
    });
  }
  if (firstPostRender && firstJsx) {
    edges.push({
      id: "flow-post-to-jsx",
      from: firstPostRender.id,
      to: firstJsx.id,
      kind: "flow",
    });
  }

  const maxY = Math.max(480, ...nodes.map((n) => n.y + 40));
  const width = 1200;
  const height = maxY + 40;

  return { nodes, edges, width, height, colX };
}

// SVG 노드–엣지 그래프 컴포넌트 정의.
interface RenderGraphSvgProps {
  analysis: ComponentAnalysis | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

function RenderGraphSvg({ analysis, svgRef }: RenderGraphSvgProps) {
  const { nodes, edges, width, height, colX } = useMemo(
    () => buildGraphFromAnalysis(analysis),
    [analysis],
  );

  if (!analysis) {
    return <div className="text-sm text-neutral-500">코드 분석 결과 없음.</div>;
  }

  if (!nodes.length) {
    return <div className="text-sm text-neutral-500">노드가 없음.</div>;
  }

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label="React 렌더링 흐름 시각화 그래프."
      width="100%"
      className="h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* 기본 화살표 마커 정의. */}
        <marker
          id="arrow-solid"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#4b5563" />
        </marker>
        <marker
          id="arrow-accent"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#b91c1c" />
        </marker>
        <marker
          id="arrow-muted"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#9ca3af" />
        </marker>
      </defs>

      {/* 엣지 렌더링. */}
      {edges.map((e) => {
        const from = nodeMap.get(e.from);
        const to = nodeMap.get(e.to);
        if (!from || !to) return null;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx);
        const offset = 40;

        const startX = from.x + Math.cos(angle) * (offset / 2);
        const startY = from.y + Math.sin(angle) * (offset / 2);
        const endX = to.x - Math.cos(angle) * (offset / 2);
        const endY = to.y - Math.sin(angle) * (offset / 2);

        let stroke = "#9ca3af";
        let strokeWidth = 1;
        let dash: string | undefined;
        let markerId = "url(#arrow-solid)";

        if (e.kind === "flow") {
          stroke = "#9ca3af";
          strokeWidth = 1;
          dash = "4 2";
          markerId = "url(#arrow-muted)";
        } else if (e.kind === "stateToJsx") {
          stroke = "#2563eb";
          strokeWidth = 1;
          dash = "3 2";
          markerId = "url(#arrow-solid)";
        } else if (e.kind === "setterToState") {
          stroke = "#b91c1c";
          strokeWidth = 1;
          dash = "2 2";
          markerId = "url(#arrow-accent)";
        } else if (e.kind === "toExternal") {
          stroke = "#4b5563";
          strokeWidth = 1;
          dash = "5 3";
          markerId = "url(#arrow-muted)";
        }

        return (
          <line
            key={e.id}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
            markerEnd={markerId}
          />
        );
      })}

      {/* 노드 렌더링. */}
      {nodes.map((node) => {
        let fill = "#ffffff";
        let stroke = "#4b5563";
        const radius = 5;
        const widthNode = 120;
        const heightNode = 30;

        if (node.type === "independent") {
          stroke = "#9ca3af";
        } else if (node.type === "renderDecision") {
          stroke = "#111827";
        } else if (node.type === "postRender") {
          stroke = "#6b7280";
        } else if (node.type === "jsx") {
          stroke = "#2563eb";
        } else if (node.type === "setter") {
          stroke = "#b91c1c";
        } else if (node.type === "external") {
          stroke = "#4b5563";
          fill = "#f9fafb";
        }

        return (
          <g
            key={node.id}
            transform={`translate(${node.x - widthNode / 2}, ${
              node.y - heightNode / 2
            })`}
          >
            <rect
              width={widthNode}
              height={heightNode}
              rx={radius}
              ry={radius}
              fill={fill}
              stroke={stroke}
              strokeWidth={1}
            />
            <text
              x={widthNode / 2}
              y={heightNode / 2 + 4}
              textAnchor="middle"
              fontSize="11"
              className="select-none"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
              fill="#111827"
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {/* 상단 컬럼 레이블. */}
      <text
        x={colX.independent}
        y={40}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        렌더링 독립.
      </text>
      <text
        x={colX.renderDecision}
        y={40}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        렌더링 결정.
      </text>
      <text
        x={colX.postRender}
        y={40}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        렌더링 후속.
      </text>
      <text
        x={colX.jsx}
        y={40}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        JSX.
      </text>

      {/* 범례. */}
      <g transform={`translate(24, ${height - 80})`}>
        <rect
          x={0}
          y={0}
          width={160}
          height={66}
          fill="#ffffff"
          stroke="#e5e7eb"
        />
        <text x={10} y={18} fontSize="11" fill="#374151">
          선 스타일.
        </text>
        <line
          x1={10}
          y1={30}
          x2={40}
          y2={30}
          stroke="#9ca3af"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
        <text x={46} y={32} fontSize="10" fill="#4b5563">
          렌더링 순서.
        </text>
        <line
          x1={10}
          y1={40}
          x2={40}
          y2={40}
          stroke="#2563eb"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <text x={46} y={42} fontSize="10" fill="#4b5563">
          상태 → JSX.
        </text>
        <line
          x1={10}
          y1={50}
          x2={40}
          y2={50}
          stroke="#b91c1c"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <text x={46} y={52} fontSize="10" fill="#4b5563">
          setter → 상태.
        </text>
      </g>
    </svg>
  );
}

// 메인 페이지 컴포넌트 정의.
export default function Page() {
  const [source, setSource] = useState<string>(
    `import React, { useState, useEffect, useRef } from 'react';

function ExampleComponent() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('effect', count);
  }, [count]);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div ref={ref}>
      <button onClick={handleClick}>Click {count}</button>
    </div>
  );
}

export default ExampleComponent;
`,
  );

  const [analysis, setAnalysis] = useState<ComponentAnalysis | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullscreenSvgRef = useRef<SVGSVGElement | null>(null);

  const handleAnalyze = () => {
    const result = analyzeReactComponent(source);
    setAnalysis(result);
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    let serialized = serializer.serializeToString(svgElement);

    if (!serialized.match(/^<svg[^>]+xmlns=/)) {
      serialized = serialized.replace(
        /^<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"',
      );
    }

    const blob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rrv-graph.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenFullscreen = () => {
    if (!analysis) return;
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  return (
    <main className="flex h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight">RRV</span>
            <span className="text-sm text-neutral-500">
              React Rendering Visualization tool.
            </span>
          </div>
        </div>
      </header>

      {/* <section id="hero" className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold md:text-xl">
              React 렌더링 흐름 SVG 시각화.
            </h1>
            <p className="text-sm text-neutral-700">
              컴포넌트 코드를 붙여 넣고 렌더링 구조를 확인하는 용도임.
            </p>
          </div>
        </div>
      </section> */}

      <section id="playground" className="flex flex-1 py-2">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4">
          <div className="grid h-full flex-1 gap-4 md:grid-cols-2">
            {/* 코드 입력 영역. */}
            <section
              aria-label="React 코드 입력 영역."
              className="flex h-full min-h-[0] flex-col"
            >
              <div className="mb-2 flex h-8 items-center justify-between">
                <label
                  htmlFor="code-input"
                  className="text-sm font-medium text-neutral-700"
                >
                  코드 입력.
                </label>
              </div>
              <textarea
                id="code-input"
                className="min-h-0 flex-1 rounded-md border border-neutral-300 bg-white p-3 font-mono text-sm leading-relaxed text-neutral-800 shadow-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleAnalyze}
                className="mt-3 self-end rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                분석 실행.
              </button>
            </section>

            {/* SVG 시각화 영역. */}
            <section
              aria-label="React 렌더링 SVG 시각화 영역."
              className="flex h-full min-h-[0] flex-col"
            >
              <div className="mb-2 flex h-8 items-center justify-between gap-2">
                <span className="text-sm font-semibold">RRV SVG 그래프.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleOpenFullscreen}
                    disabled={!analysis}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    전체 화면.
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    disabled={!analysis}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    SVG 다운로드.
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-2">
                {analysis && analysis.errors.length > 0 && (
                  <div className="mb-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-sm text-red-700">
                    {analysis.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}
                <div className="h-full w-full">
                  <RenderGraphSvg analysis={analysis} svgRef={svgRef} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4 text-xs text-neutral-500">
          <span>RRV · React Rendering Visualization tool.</span>
          <a
            href="https://github.com/selfishAltruism"
            target="_blank"
            rel="noopener noreferrer"
          >
            Designed & Made by <strong>Kyu</strong>
          </a>
        </div>
      </footer>

      {/* 전체 화면 SVG 오버레이. */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative h-[90vh] w-[90vw] rounded-md bg-white p-3 shadow-lg">
            <button
              type="button"
              onClick={handleCloseFullscreen}
              className="absolute top-2 right-4 rounded-md text-sm text-neutral-700 hover:bg-neutral-100"
            >
              x
            </button>
            <div className="mt-6 h-[calc(100%-2.5rem)] w-full overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <div className="h-full w-full">
                <RenderGraphSvg analysis={analysis} svgRef={fullscreenSvgRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

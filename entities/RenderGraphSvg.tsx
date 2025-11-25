"use client";

import React, { useMemo } from "react";
import type { ComponentAnalysis } from "../libs/analyzeReactComponent";
import {
  buildGraphFromAnalysis,
  type GraphNode,
  type GraphEdge,
} from "../libs/graphModel";

interface RenderGraphSvgProps {
  analysis: ComponentAnalysis | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function RenderGraphSvg({ analysis, svgRef }: RenderGraphSvgProps) {
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
      {edges.map((e: GraphEdge) => {
        const from = nodeMap.get(e.from);
        const to = nodeMap.get(e.to);
        if (!from || !to) return null;

        let startX = from.x;
        let startY = from.y;
        let endX = to.x;
        let endY = to.y;

        let stroke = "#9ca3af";
        const strokeWidth = 1;
        let dash: string | undefined;
        let markerId = "url(#arrow-solid)";

        if (e.kind === "flow") {
          stroke = "#9ca3af";
          dash = "4 2";
          markerId = "url(#arrow-muted)";
        } else if (e.kind === "stateToJsx") {
          stroke = "#2563eb";
          dash = "3 2";
        } else if (e.kind === "refToJsx") {
          stroke = "#10b981";
          dash = "3 2";
        } else if (e.kind === "propToJsx") {
          stroke = "#8b5cf6";
          dash = "3 2";
        } else if (e.kind === "setterToState") {
          stroke = "#b91c1c";
          dash = "2 2";
        } else if (e.kind === "stateToEffect") {
          stroke = "#f97316";
          dash = "3 2";
        } else if (e.kind === "effectToState") {
          stroke = "#dc2626";
          dash = "2 2";
        } else if (e.kind === "effectToRef") {
          stroke = "#22c55e";
          dash = "2 2";
        } else if (e.kind === "stateToVariable") {
          stroke = "#2563eb";
          dash = "3 2";
        } else if (e.kind === "refToVariable") {
          stroke = "#10b981";
          dash = "3 2";
        } else if (e.kind === "variableToVariable") {
          stroke = "#0f766e";
          dash = "4 2";
        } else if (e.kind === "globalToVariable") {
          stroke = "#9ca3af";
          dash = "3 2";
        } else if (e.kind === "variableToJsx") {
          stroke = "#0f766e";
          dash = "2 2";
        } else if (e.kind === "toExternalUp") {
          // 위로 향하는 외부 호출 화살표 처리.
          stroke = "#4b5563";
          dash = "5 3";
          markerId = "url(#arrow-muted)";
          startX = from.x;
          startY = from.y - 18;
          endX = from.x;
          endY = from.y - 80;
        }

        if (e.kind !== "toExternalUp") {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const angle = Math.atan2(dy, dx);
          const offset = 40;

          startX = from.x + Math.cos(angle) * (offset / 2);
          startY = from.y + Math.sin(angle) * (offset / 2);
          endX = to.x - Math.cos(angle) * (offset / 2);
          endY = to.y - Math.sin(angle) * (offset / 2);
        }

        return (
          <g key={e.id}>
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              markerEnd={markerId}
            />
            {e.kind === "toExternalUp" && e.label && (
              <text
                x={startX}
                y={endY - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#4b5563"
              >
                {e.label}
              </text>
            )}
            {e.kind === "setterToState" && e.label && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#b91c1c"
              >
                {e.label}
              </text>
            )}
            {e.kind === "propToJsx" && e.label && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#8b5cf6"
              >
                {e.label}
              </text>
            )}
            {e.kind === "variableToJsx" && e.label && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#0f766e"
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 노드 렌더링. */}
      {nodes.map((node: GraphNode) => {
        let fill = "#ffffff";
        let stroke = "#4b5563";
        const textFill = "#111827";

        const radius = 6;
        const widthNode = 128;
        const heightNode = 32;

        if (node.type === "independent") {
          stroke = "#9ca3af";
        } else if (node.type === "renderDecision") {
          stroke = "#111827";
        } else if (node.type === "variable") {
          stroke = "#0f766e";
          fill = "#ecfdf5";
        } else if (node.type === "postRender") {
          stroke = "#6b7280";
        } else if (node.type === "jsx") {
          stroke = "#2563eb";
        }

        // 네트워크 계열 색상 강조.
        if (
          node.kind === "reactQuery" ||
          node.kind === "fetch" ||
          node.kind === "axios"
        ) {
          fill = "#eff6ff";
          stroke = "#1d4ed8";
        }

        if (node.kind === "useEffect") {
          fill = "#fff7ed";
          stroke = "#ea580c";
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
              y={heightNode / 2 + 5}
              textAnchor="middle"
              fontSize="11"
              className="select-none"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
              fill={textFill}
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {/* 상단 컬럼 레이블. */}
      <text
        x={colX.independent}
        y={32}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        렌더링 독립
      </text>
      <text
        x={colX.renderDecision}
        y={32}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        렌더링 결정 / Props
      </text>
      <text
        x={colX.variable}
        y={32}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        변수
      </text>
      <text
        x={colX.postRender}
        y={32}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        렌더링 후속
      </text>
      <text
        x={colX.jsx}
        y={32}
        textAnchor="middle"
        fontSize="12"
        fill="#4b5563"
      >
        JSX
      </text>
    </svg>
  );
}

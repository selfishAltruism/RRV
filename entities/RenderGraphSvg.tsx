"use client";

import React, { useMemo } from "react";

import { buildGraphFromMappingResult } from "@/shared/libs/buildGraph/buildGraph";
import { getEdgeStyle } from "@/shared/libs/ui/svg";

interface RenderGraphSvgProps {
  mappingResult: Mapping.MappingResult | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

// buildGraphFromMappingResult 반환 타입 재사용
type GraphLayout = ReturnType<typeof buildGraphFromMappingResult>;
type GraphNode = GraphLayout["nodes"][number];
type GraphEdge = GraphLayout["edges"][number];

/**
 * JSX 노드들을
 * - depth 기준으로 가로(오른쪽) 방향 확장
 * - DFS 순서대로 전역 row를 증가시켜 부모/자식/형제가 위→아래로 자연스럽게 내려가도록 배치
 *
 * 전제:
 *   - JSX 노드: node.kind === "jsx"
 *   - 부모 관계: node.meta?.jsxParentId (string | undefined)
 */
function applyJsxTreeLayout(layout: GraphLayout): GraphLayout {
  const { nodes, edges, width, height, colX } = layout;

  // JSX 노드만 추출
  const jsxNodes = nodes.filter((n: GraphNode) => n.kind === "jsx");
  if (!jsxNodes.length) {
    return layout;
  }

  // 부모 ID 정보 수집 (없으면 루트 취급)
  const parentIdMap = new Map<string, string | undefined>();
  for (const node of jsxNodes) {
    const meta = node.meta as { jsxParentId?: string } | undefined;
    parentIdMap.set(node.id, meta?.jsxParentId);
  }

  // JSX 노드 id → node 매핑
  const jsxNodeById = new Map<string, GraphNode>();
  for (const node of jsxNodes) {
    jsxNodeById.set(node.id, node);
  }

  // 루트 JSX 노드: 부모가 없거나, 부모가 JSX 노드 목록에 없는 경우
  const rootJsxNodes = jsxNodes.filter((node) => {
    const parentId = parentIdMap.get(node.id);
    return !parentId || !jsxNodeById.has(parentId);
  });

  // 레이아웃 파라미터
  const baseX = colX.jsx; // depth 0 기준 x (JSX 컬럼)
  const depthGapX = 160; // depth 증가 시 가로 이동량

  const baseY = 80; // 시작 Y
  const rowGapY = 40; // row 간 세로 간격

  const newNodePositions = new Map<string, { x: number; y: number }>();

  const getChildren = (node: GraphNode): GraphNode[] =>
    jsxNodes.filter((child) => parentIdMap.get(child.id) === node.id);

  /**
   * 서브트리 레이아웃
   * - node: 현재 노드
   * - depth: JSX depth
   * - rowStart: 이 서브트리가 시작되는 전역 row 인덱스
   *
   * 반환값: 이 서브트리가 사용한 row 개수
   */
  function layoutSubtree(
    node: GraphNode,
    depth: number,
    rowStart: number,
  ): number {
    const x = baseX + depth * depthGapX; // 중앙 정렬 없이 오른쪽으로만 확장
    const y = baseY + rowStart * rowGapY;

    newNodePositions.set(node.id, { x, y });

    const children = getChildren(node);
    if (children.length === 0) {
      // 자기 자신 한 줄만 사용
      return 1;
    }

    // 1) 첫 번째 자식은 부모와 같은 row에 배치
    const firstChild = children[0];
    const firstHeight = layoutSubtree(firstChild, depth + 1, rowStart);

    // 2) 두 번째 자식부터는 아래로 쌓기
    let cursorRow = rowStart + firstHeight;

    for (let i = 1; i < children.length; i += 1) {
      const child = children[i];
      const h = layoutSubtree(child, depth + 1, cursorRow);
      cursorRow += h;
    }

    // 전체 서브트리가 사용한 row 수
    return Math.max(1, cursorRow - rowStart);
  }

  // 루트들부터 순서대로 서브트리 레이아웃
  let currentRow = 0;
  for (const root of rootJsxNodes) {
    const used = layoutSubtree(root, 0, currentRow);
    currentRow += used; // 서브트리 바로 아래에 다음 루트 배치
  }

  // 노드 좌표 갱신
  const newNodes: GraphNode[] = nodes.map((node) => {
    const pos = newNodePositions.get(node.id);
    if (!pos) return node;

    return {
      ...node,
      x: pos.x,
      y: pos.y,
    };
  });

  // edge 좌표도 JSX 노드 기준으로 덮어쓰기
  const nodeByIdAfter = new Map<string, GraphNode>();
  for (const node of newNodes) {
    nodeByIdAfter.set(node.id, node);
  }

  const newEdges: GraphEdge[] = edges.map((edge) => {
    const fromNodeId = edge.from.nodeId as string | undefined;
    const toNodeId = edge.to.nodeId as string | undefined;

    let newFrom = edge.from;
    let newTo = edge.to;

    if (fromNodeId && nodeByIdAfter.has(fromNodeId)) {
      const n = nodeByIdAfter.get(fromNodeId)!;
      newFrom = {
        ...edge.from,
        x: n.x,
        y: n.y,
      };
    }

    if (toNodeId && nodeByIdAfter.has(toNodeId)) {
      const n = nodeByIdAfter.get(toNodeId)!;
      newTo = {
        ...edge.to,
        x: n.x,
        y: n.y,
      };
    }

    return {
      ...edge,
      from: newFrom,
      to: newTo,
    };
  });

  // 높이/너비 보정
  let maxY = height;
  for (const node of newNodes) {
    const bottom = node.y + node.height / 2 + 40;
    if (bottom > maxY) maxY = bottom;
  }

  let maxX = width;
  for (const node of newNodes) {
    const right = node.x + node.width / 2 + 40;
    if (right > maxX) maxX = right;
  }

  return {
    nodes: newNodes,
    edges: newEdges,
    width: maxX,
    height: maxY,
    colX,
  };
}

/**
 * 두 점 사이를 부드러운 S자 곡선으로 연결하는 path 생성
 */
function buildCurvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const mx = (x1 + x2) / 2;
  const dy = y2 - y1;
  const offset = Math.max(Math.min(dy * 0.3, 80), -80);

  const c1x = mx;
  const c1y = y1 + offset;
  const c2x = mx;
  const c2y = y2 - offset;

  return `M ${x1} ${y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;
}

export function RenderGraphSvg({ mappingResult, svgRef }: RenderGraphSvgProps) {
  const { nodes, edges, width, height, colX } = useMemo(() => {
    const base = buildGraphFromMappingResult(mappingResult);
    // JSX 영역 트리 레이아웃 적용
    return applyJsxTreeLayout(base);
  }, [mappingResult]);

  if (!mappingResult) {
    return <div className="text-sm text-neutral-500">코드 분석 결과 없음.</div>;
  }

  if (!nodes.length) {
    return (
      <div className="text-sm text-neutral-500">
        분석 가능한 노드가 없습니다.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto rounded-md border bg-white">
      <svg ref={svgRef} width={width} height={height} className="block">
        {/* defs: arrow marker 정의 */}
        <defs>
          {/* 기본 흐름 화살표 */}
          <marker
            id="arrow-solid"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="#8b5cf6" />
          </marker>

          {/* muted 화살표 */}
          <marker
            id="arrow-muted"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="#9ca3af" />
          </marker>

          {/* 상태 변경 강조 화살표 */}
          <marker
            id="arrow-accent"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="#b91c1c" />
          </marker>
        </defs>

        {/* 컬럼 타이틀 */}
        <g fontSize={11} fill="#4b5563">
          <text x={colX.independent} y={40} textAnchor="middle">
            렌더링 독립
          </text>
          <text x={colX.state} y={40} textAnchor="middle">
            렌더링 결정 / 상태
          </text>
          <text x={colX.variable} y={40} textAnchor="middle">
            변수 / 헬퍼
          </text>
          <text x={colX.effect} y={40} textAnchor="middle">
            렌더링 후속
          </text>
          <text x={colX.jsx} y={40} textAnchor="middle">
            JSX
          </text>
        </g>

        {/* edge (곡선) */}
        <g>
          {edges.map((edge) => {
            const style = getEdgeStyle(edge.kind);
            const d = buildCurvePath(
              edge.from.x,
              edge.from.y,
              edge.to.x,
              edge.to.y,
            );

            const midX = (edge.from.x + edge.to.x) / 2;
            const midY = (edge.from.y + edge.to.y) / 2;

            return (
              <g key={edge.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth={1}
                  strokeDasharray={style.dashed ? "3 2" : undefined}
                  markerEnd={`url(#${style.markerId})`}
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 4}
                    fontSize={9}
                    textAnchor="middle"
                    fill={style.stroke}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* nodes */}
        <g>
          {nodes.map((node) => {
            const radius = 6;
            const rectX = node.x - node.width / 2;
            const rectY = node.y - node.height / 2;

            let fill = "#ffffff";
            let stroke = "#d1d5db";

            switch (node.kind) {
              case "independent":
                stroke = "#6b7280";
                break;
              case "state":
                stroke = "#2563eb";
                fill = "#eff6ff";
                break;
              case "effect":
                stroke = "#8b5cf6";
                fill = "#f5f3ff";
                break;
              case "jsx":
                stroke = "#0f766e";
                fill = "#ecfdf5";
                break;
              case "external":
                stroke = "#9ca3af";
                fill = "#f9fafb";
                break;
              case "variable":
              default:
                stroke = "#9ca3af";
                fill = "#ffffff";
                break;
            }

            return (
              <g key={node.id}>
                <rect
                  x={rectX}
                  y={rectY}
                  rx={radius}
                  ry={radius}
                  width={node.width}
                  height={node.height}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1}
                />
                <text
                  x={node.x}
                  y={node.y + 3}
                  fontSize={11}
                  textAnchor="middle"
                  fill="#111827"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export function getNodeCenter(node: BuildGraph.GraphNode) {
  return {
    cx: node.x, // 이미 center x
    cy: node.y, // 이미 center y
  };
}

export function getHorizontalAnchors(
  fromNode: BuildGraph.GraphNode,
  toNode: BuildGraph.GraphNode,
) {
  const fromHalfW = fromNode.width / 2;
  const toHalfW = toNode.width / 2;

  // from: 오른쪽 중앙
  const fromX = fromNode.x + fromHalfW;
  const fromY = fromNode.y;

  // to: 왼쪽 중앙
  const toX = toNode.x - toHalfW;
  const toY = toNode.y;

  return { fromX, fromY, toX, toY };
}
export function getCornerToward(
  node: BuildGraph.GraphNode,
  towardDx: number,
  towardDy: number,
) {
  const halfW = node.width / 2;
  const halfH = node.height / 2;

  // dx, dy 기준으로 사분면 판단
  if (towardDx >= 0 && towardDy >= 0) {
    // 오른쪽-아래 방향 → 오른쪽-아래 코너
    return {
      x: node.x + halfW,
      y: node.y + halfH,
    };
  }
  if (towardDx >= 0 && towardDy < 0) {
    // 오른쪽-위 방향 → 오른쪽-위 코너
    return {
      x: node.x + halfW,
      y: node.y - halfH,
    };
  }
  if (towardDx < 0 && towardDy >= 0) {
    // 왼쪽-아래 방향 → 왼쪽-아래 코너
    return {
      x: node.x - halfW,
      y: node.y + halfH,
    };
  }
  // 왼쪽-위 방향
  return {
    x: node.x - halfW,
    y: node.y - halfH,
  };
}

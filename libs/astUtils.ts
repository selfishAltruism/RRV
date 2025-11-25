// libs/astUtils.ts
import type { Node } from "@babel/types";

export function isNode(value: unknown): value is Node {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "type" in value;
}

// 전체 AST를 순회하는 유틸 함수 정의.
export function walk(
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

// 노드 내부에서 Identifier 이름들을 수집하는 유틸 함수 정의.
export function collectIdentifierNames(node: Node): string[] {
  const names = new Set<string>();

  walk(node, (n) => {
    if (n.type === "Identifier") {
      names.add(n.name);
    }
  });

  return Array.from(names);
}

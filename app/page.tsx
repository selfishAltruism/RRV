"use client";

import { useRef, useState } from "react";
import { Download, Expand, X } from "lucide-react";

import { mapping } from "@/shared/libs/mapping/mapping";
import { RenderGraphSvg } from "@/entities/RenderGraphSvg";
import { SOURCE_INIT } from "@/shared/consts";
import Link from "next/link";

export default function Page() {
  const [source, setSource] = useState<string>(SOURCE_INIT);

  const [mappingResult, setMappingResult] =
    useState<Mapping.MappingResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullscreenSvgRef = useRef<SVGSVGElement | null>(null);

  const handleAnalyze = () => {
    const result = mapping(source);
    setMappingResult(result);
  };

  const handleDownloadSvg = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

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
    link.download = "crv-graph.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenFullscreen = () => {
    if (!mappingResult) return;
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  return (
    <>
      <section id="playground" className="flex flex-1 py-2">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4">
          <div className="grid h-full flex-1 gap-4 md:grid-cols-2">
            {/* Code input area */}
            <section
              aria-label="React code input area."
              className="flex h-full min-h-[0] flex-col"
            >
              <div className="mt-1 mb-1 flex h-8 items-center justify-between">
                <label htmlFor="code-input" className="text-[15px] font-bold">
                  Component Source Code
                </label>
              </div>
              <textarea
                id="code-input"
                className="min-h-0 flex-1 border border-neutral-300 bg-white p-3 font-mono text-sm leading-relaxed text-neutral-800 shadow-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleAnalyze}
                className="mt-3 self-end rounded-sm bg-green-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-800"
              >
                Build Graph!
              </button>
            </section>

            {/* SVG visualization area */}
            <section
              aria-label="React rendering SVG visualization area."
              className="flex h-full min-h-[0] flex-col"
            >
              <div className="mt-1 mb-1 flex h-8 items-center justify-between gap-2">
                <span className="text-[15px] font-semibold">Graph</span>
                <div className="-mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    disabled={!mappingResult}
                    aria-label="Download graph as SVG"
                    title="Download SVG"
                    className="flex items-center gap-1 rounded-sm border border-green-700 bg-green-700 px-2 py-2 text-sm text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenFullscreen}
                    disabled={!mappingResult}
                    aria-label="Open fullscreen graph"
                    title="Fullscreen"
                    className="rounded-sm border border-green-700 bg-green-700 px-2 py-2 text-sm text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Expand size={15} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto border border-neutral-200 bg-neutral-50 p-2">
                {mappingResult && mappingResult.errors.length > 0 && (
                  <div
                    className="mb-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-sm text-red-700"
                    role="alert"
                    aria-label="Analysis errors"
                  >
                    {mappingResult.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}
                <div className="h-full w-full">
                  <RenderGraphSvg
                    mappingResult={mappingResult}
                    svgRef={svgRef}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex h-14 max-w-6xl flex-col items-start justify-center px-4 text-xs text-neutral-500">
          <span>© 2025 crv. All rights reserved.</span>
          <div className="flex gap-1">
            <a
              href="https://github.com/selfishAltruism"
              target="_blank"
              rel="noopener noreferrer"
            >
              Designed &amp; Made by <strong className="underline">Kyu</strong>
            </a>
            <span>|</span>
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

      {/* Fullscreen SVG overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute h-full w-full bg-black/70"
            onClick={handleCloseFullscreen}
            aria-label="Close fullscreen overlay"
            role="button"
            tabIndex={0}
          ></div>

          <div className="relative h-[90vh] w-[90vw] rounded-sm bg-white p-3 shadow-lg">
            <span className="absolute text-[15px] font-semibold">Graph</span>
            <button
              type="button"
              onClick={handleCloseFullscreen}
              className="absolute top-3 right-3 rounded-sm text-sm text-neutral-700"
              aria-label="Close fullscreen"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="mt-7 h-[calc(100%-30px)] w-full overflow-auto rounded-sm border border-neutral-200 bg-neutral-50 p-2">
              <div className="h-full w-full">
                <RenderGraphSvg
                  mappingResult={mappingResult}
                  svgRef={fullscreenSvgRef}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

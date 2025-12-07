import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 - crv.",
  description:
    "crv(React Code-based Rendering Visualization Tool)의 개인정보 처리방침 페이지입니다.",
};

export default function PrivacyPage() {
  return (
    <div className="h-full bg-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 border-b border-neutral-200 pb-4">
          <h1 className="text-2xl font-bold text-neutral-900">
            개인정보 처리방침
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            최종 업데이트일: 2025-12-07
          </p>
        </header>

        <section className="h-[calc(100vh-250px)] space-y-5 overflow-y-auto text-sm leading-relaxed text-neutral-800">
          <p>
            본 개인정보 처리방침은 crv(React Code-based Rendering Visualization
            Tool, 이하 &quot;서비스&quot;)에서 제공되는 기능 및 사용자의
            개인정보 처리 방식에 대해 설명합니다.
          </p>

          {/* 1. 수집하는 정보 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              1. 수집하는 정보
            </h2>
            <p className="mb-2">
              서비스는 아래와 같이 사용자의 개인정보를 직접적으로 수집하지
              않습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                사용자가 입력하는 React 소스 코드는 서버로 전송되지 않으며,
                브라우저 내에서만 분석이 수행됩니다.
              </li>
              <li>
                이름, 이메일, 연락처 등 개인을 직접 식별할 수 있는 정보는
                수집하지 않습니다.
              </li>
            </ul>

            <p className="mt-4 mb-2">
              다만, 다음과 같은 경우 자동으로 일부 정보가 수집될 수 있습니다.
            </p>

            <h3 className="mb-1 text-sm font-semibold text-neutral-900">
              (1) 쿠키 및 광고 식별자
            </h3>
            <p className="mb-2">
              Google AdSense 및 기타 분석 도구(사용하는 경우)는 다음과 같은
              정보를 자동으로 수집할 수 있습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>쿠키(Cookie) 식별값</li>
              <li>방문 빈도 및 이용 패턴</li>
              <li>접속 브라우저 및 기기 정보</li>
              <li>IP 주소를 기반으로 한 대략적인 위치 정보</li>
            </ul>
            <p className="mt-2">
              위 정보는 통상적으로 개인 식별이 되지 않는 익명·비식별 정보로
              처리됩니다.
            </p>
          </section>

          {/* 2. 정보의 이용 목적 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              2. 정보의 이용 목적
            </h2>
            <p className="mb-2">
              서비스는 자동 수집된 정보를 아래 목적을 위해 활용할 수 있습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>서비스 품질 개선 및 기능 고도화</li>
              <li>오류 분석 및 이용 통계 작성</li>
              <li>광고 노출 및 광고 성과 측정(Google AdSense 사용 시)</li>
            </ul>
          </section>

          {/* 3. Google AdSense 광고 관련 고지 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              3. Google AdSense 광고 관련 고지
            </h2>
            <p className="mb-2">
              본 서비스는 Google AdSense를 통해 광고를 게재할 수 있으며, 이에
              따라 Google은 다음과 같은 방식으로 정보를 이용할 수 있습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>쿠키를 활용한 맞춤형 광고 제공</li>
              <li>사용자 행동 기반 광고 타겟팅</li>
              <li>광고 노출 및 클릭에 대한 통계 수집</li>
            </ul>
            <p className="mt-2">
              Google의 광고 및 쿠키 사용에 관한 자세한 내용은 아래 링크에서
              확인할 수 있습니다.
            </p>
            <p className="mt-1 break-all text-neutral-700">
              https://policies.google.com/technologies/ads
            </p>
          </section>

          {/* 4. 제3자 제공 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              4. 개인정보의 제3자 제공
            </h2>
            <p className="mb-2">
              서비스는 사용자의 개인정보를 제3자에게 판매하거나 임의로 제공하지
              않습니다. 다만, 다음의 경우에는 예외적으로 개인정보를 제공할 수
              있습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>법령에 특별한 규정이 있는 경우</li>
              <li>수사기관이 법령에 따른 절차와 방법에 따라 요청한 경우</li>
            </ul>
          </section>

          {/* 5. 데이터 보관 및 삭제 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              5. 데이터 보관 및 삭제
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                사용자가 입력한 React 소스 코드는 서버에 저장되지 않으며,
                브라우저 탭을 종료하거나 새로고침할 경우 소멸됩니다.
              </li>
              <li>
                쿠키 및 광고 식별 정보는 Google 등 제3자 광고·분석 제공자의
                정책에 따라 처리되며, 서비스 운영자가 직접 해당 데이터를
                보관·관리하지 않습니다.
              </li>
            </ul>
          </section>

          {/* 6. 이용자의 권리 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              6. 이용자의 권리 및 쿠키 차단 방법
            </h2>
            <p className="mb-2">
              이용자는 언제든지 브라우저 설정을 통해 쿠키 저장을 거부하거나
              삭제할 수 있습니다. 브라우저별 설정 방법 예시는 아래와 같습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Chrome: 설정 &gt; 개인정보 및 보안 &gt; 쿠키 및 기타 사이트
                데이터
              </li>
              <li>Safari: 설정 &gt; 개인정보 보호 &gt; 쿠키 차단</li>
              <li>
                Edge, Firefox 등 기타 브라우저도 유사한 메뉴를 통해 쿠키 차단 및
                삭제가 가능합니다.
              </li>
            </ul>
          </section>

          {/* 7. 개인정보 보호책임자 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              7. 개인정보 보호책임자
            </h2>
            <p className="mb-2">
              서비스의 개인정보 보호와 관련된 문의는 아래 연락처를 통해 요청하실
              수 있습니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>담당자: Kyu</li>
              <li className="break-all">
                문의 e-mail: <span>officialkyus@gmail.com</span>
              </li>
            </ul>
          </section>

          {/* 8. 개인정보 처리방침 변경 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              8. 개인정보 처리방침의 변경
            </h2>
            <p>
              본 개인정보 처리방침은 관련 법령의 개정 또는 서비스 내용의 변경
              등에 따라 수정될 수 있습니다. 중요한 변경 사항이 있을 경우 서비스
              내 공지 등을 통해 합리적인 방법으로 고지합니다.
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}

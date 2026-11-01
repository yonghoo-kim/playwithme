import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/LegalPage";
import { LEGAL_VERSION } from "@/lib/consent";

// DRAFT — NEEDS LEGAL REVIEW before launch. Written by the dev team to match
// how the app works today. Placeholder the operator must fill in:
// "[운영자 이메일]" (and the operator's name/business details if required).
// Bump LEGAL_VERSION (src/lib/consent.ts) together with the effective date
// whenever this text changes.

export const metadata: Metadata = {
  title: "이용약관 | 나랑 놀자",
};

const CONTACT = "[운영자 이메일]";

export default function TermsPage() {
  return (
    <LegalPage title="이용약관" effectiveDate={LEGAL_VERSION}>
      <LegalSection title="제1조 (목적)">
        <p>
          이 약관은 나랑 놀자(이하 &ldquo;서비스&rdquo;)를 이용하는 조건과
          절차, 운영자와 이용자의 권리·의무를 정합니다.
        </p>
      </LegalSection>

      <LegalSection title="제2조 (서비스 소개)">
        <p>
          서비스는 보호자가 아이의 현재 장소와 상태를 친구 가족과 나누고,
          함께 대화할 수 있게 해 주는 무료 서비스입니다. 주요 기능은 다음과
          같습니다.
        </p>
        <LegalList>
          <li>
            아이의 현재 상태 공유: 보호자가 직접 등록한 장소(예: 놀이터,
            어린이집) 중 하나를 골라 &lsquo;있어요&rsquo; 또는 &lsquo;가는
            중&rsquo;으로 알립니다. GPS로 위치를 추적하지 않습니다.
          </li>
          <li>그룹 만들기·초대, 다른 보호자 초대</li>
          <li>그룹 채팅과 1:1 채팅</li>
          <li>상태 변경과 새 메시지 푸시 알림</li>
          <li>현재 위치의 날씨 표시(기상청 자료)</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="제3조 (약관의 효력과 변경)">
        <p>
          이 약관은 서비스 화면에 게시하고, 이용자가 회원가입 때 동의하면
          효력이 생깁니다. 운영자는 관련 법령을 어기지 않는 범위에서 약관을
          바꿀 수 있으며, 바꿀 때는 시행 7일 전(이용자에게 불리한 변경은 30일
          전)부터 서비스 화면에 알립니다. 바뀐 약관에 동의하지 않으면 회원
          탈퇴할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="제4조 (회원가입)">
        <LegalList>
          <li>
            회원은 아이를 돌보는 만 14세 이상의 보호자입니다. 아이가 직접
            가입하는 서비스가 아닙니다.
          </li>
          <li>
            보호자는 이메일과 비밀번호로 가입하고, 이 약관과{" "}
            <Link href="/privacy" className="text-blue-900 underline">
              개인정보처리방침
            </Link>
            에 동의해야 합니다.
          </li>
          <li>
            만 14세 미만 아이의 정보는 보호자가 법정대리인으로서 직접
            등록하며, 가입 시 그 등록에 동의합니다. 자신이 법정대리인이 아니거나
            돌보지 않는 아이의 정보를 등록해서는 안 됩니다.
          </li>
          <li>
            다른 사람의 이메일을 쓰거나 사실과 다른 정보로 가입하면 이용이
            제한될 수 있습니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="제5조 (이용자의 의무)">
        <p>이용자는 다음 행동을 해서는 안 됩니다.</p>
        <LegalList>
          <li>다른 사람의 계정을 쓰거나 비밀번호를 알아내려는 행위</li>
          <li>
            채팅에서 욕설, 괴롭힘, 혐오 표현, 음란물, 광고, 다른 사람의 개인정보
            공개 등 다른 이용자에게 피해를 주는 행위
          </li>
          <li>그룹·보호자 초대 링크를 모르는 사람에게 퍼뜨리는 행위</li>
          <li>서비스를 해킹하거나 정상적인 운영을 방해하는 행위</li>
          <li>법령이나 이 약관을 어기는 행위</li>
        </LegalList>
        <p>
          이용자는 자기 계정과 비밀번호를 스스로 관리해야 하며, 누군가 몰래
          쓰고 있다고 생각되면 바로 비밀번호를 바꾸고 운영자에게 알려야
          합니다.
        </p>
      </LegalSection>

      <LegalSection title="제6조 (게시물)">
        <p>
          채팅 메시지 등 이용자가 올린 내용의 책임은 올린 이용자에게 있습니다.
          운영자는 제5조를 어긴 게시물을 알게 되면 삭제하거나 해당 이용자의
          이용을 제한할 수 있습니다. 게시물은 그 게시물이 보이는 그룹(1:1
          채팅은 두 가족)의 보호자에게만 보입니다.
        </p>
      </LegalSection>

      <LegalSection title="제7조 (서비스의 변경과 중단)">
        <p>
          운영자는 서비스를 더 좋게 만들기 위해 기능을 바꾸거나, 점검·장애·업체
          사정 등으로 서비스를 잠시 멈출 수 있습니다. 서비스를 완전히 끝내야
          할 때는 30일 전에 서비스 화면으로 알립니다.
        </p>
      </LegalSection>

      <LegalSection title="제8조 (이용 제한)">
        <p>
          이용자가 제5조를 어기면 운영자는 경고, 일시 정지, 계정 삭제 순으로
          이용을 제한할 수 있습니다. 다만 다른 이용자나 아이의 안전을 해치는
          심각한 경우에는 바로 제한할 수 있습니다. 이용자는 제한에 대해
          운영자에게 이의를 제기할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="제9조 (회원 탈퇴)">
        <p>
          이용자는 언제든지 설정 &gt; 계정 &gt; 회원탈퇴에서 탈퇴할 수 있으며,
          탈퇴하면 바로 처리됩니다. 탈퇴 시 삭제되는 정보와 남는 정보는{" "}
          <Link href="/privacy" className="text-blue-900 underline">
            개인정보처리방침
          </Link>{" "}
          5번 항목에 적혀 있습니다. 삭제된 정보는 되돌릴 수 없습니다.
        </p>
      </LegalSection>

      <LegalSection title="제10조 (책임의 한계)">
        <LegalList>
          <li>
            서비스에 표시되는 아이의 상태는 보호자가 직접 고른 정보이며, 아이의
            실제 위치나 안전을 보장하지 않습니다. 아이의 안전은 보호자가 직접
            확인해야 합니다.
          </li>
          <li>
            푸시 알림은 휴대폰 설정, 네트워크, 알림 업체 사정에 따라 늦거나
            오지 않을 수 있습니다.
          </li>
          <li>날씨는 기상청 자료를 바탕으로 한 참고 정보입니다.</li>
          <li>
            운영자는 무료로 제공하는 서비스와 관련해, 운영자의 고의 또는 중대한
            과실이 없는 한 이용자에게 생긴 손해를 책임지지 않습니다. 이용자끼리
            생긴 분쟁은 당사자끼리 해결하는 것을 원칙으로 합니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="제11조 (분쟁 해결)">
        <p>
          이 약관은 대한민국 법에 따릅니다. 서비스 이용과 관련한 분쟁은 먼저
          운영자와 이용자가 성실히 협의하며, 소송이 필요한 경우 민사소송법에
          따른 관할 법원에서 해결합니다.
        </p>
      </LegalSection>

      <LegalSection title="제12조 (문의)">
        <p>서비스에 관한 문의: {CONTACT}</p>
      </LegalSection>

      <p className="text-sm text-gray-500">
        부칙: 이 약관은 {LEGAL_VERSION}부터 시행합니다.
      </p>
    </LegalPage>
  );
}

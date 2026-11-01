import type { Metadata } from "next";
import LegalPage, { LegalList, LegalSection } from "@/components/LegalPage";
import { LEGAL_VERSION } from "@/lib/consent";

// DRAFT — NEEDS LEGAL REVIEW before launch. Written by the dev team to match
// what the app actually collects and how (supabase/migrations, src/lib,
// src/app/api/account/delete).
// Bump LEGAL_VERSION (src/lib/consent.ts) together with the effective date
// whenever this text changes.

export const metadata: Metadata = {
  title: "개인정보처리방침 | 나랑 놀자",
};

const CONTACT = "tjdsidvkfl0117@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" effectiveDate={LEGAL_VERSION}>
      <p>
        나랑 놀자(이하 &ldquo;서비스&rdquo;)는 보호자가 아이의 현재 장소와
        상태를 친구 가족과 나누고 대화할 수 있게 해 주는 서비스입니다.
        서비스는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고,
        필요한 만큼만 수집해 안전하게 처리합니다. 이 방침은 어떤 정보를 왜
        모으고, 얼마나 보관하며, 누구에게 처리를 맡기는지 알려 드립니다.
      </p>

      <LegalSection title="1. 수집하는 개인정보">
        <p>서비스는 아래 정보만 처리합니다.</p>
        <LegalList>
          <li>
            <b>회원가입 시</b>: 보호자의 이메일 주소, 비밀번호. 비밀번호는
            인증 업체(Supabase)가 복원할 수 없는 방식(해시)으로 바꿔 저장하므로
            운영자도 원래 비밀번호를 볼 수 없습니다.
          </li>
          <li>
            <b>아이 정보</b>: 보호자가 직접 입력한 아이의 이름(별명도
            괜찮습니다). 생년월일, 사진, 연락처 등은 받지 않습니다.
          </li>
          <li>
            <b>서비스 이용 중 만들어지는 정보</b>: 그룹(이름, 초대 코드, 만든
            사람)과 아이의 그룹 참여 기록, 보호자가 등록한 장소(이름, 아이콘,
            알림 여부), 아이의 현재 상태(선택한 장소 또는 집, &lsquo;가는
            중&rsquo; 여부, 바뀐 시각), 그룹 채팅·1:1 채팅 메시지와 보낸 시각,
            채팅을 마지막으로 읽은 시각, 보호자 초대 링크 기록, 약관 동의
            일시와 동의한 약관 버전.
          </li>
          <li>
            <b>알림을 켠 경우</b>: 푸시 알림을 보내기 위한 기기 토큰(Firebase
            Cloud Messaging 토큰)과 알림 설정(밤 시간 알림 끄기, 그룹별 알림
            끄기).
          </li>
          <li>
            <b>자동으로 남는 정보</b>: 서비스에 접속할 때 호스팅·인증 업체의
            서버에 IP 주소, 접속 시각, 브라우저 정보 같은 접속 기록이 남을 수
            있습니다.
          </li>
        </LegalList>
        <p>
          서비스는 GPS로 아이의 위치를 추적하지 않습니다. 아이의 상태는
          보호자가 직접 고른 장소 이름(예: 놀이터, 어린이집)일 뿐입니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 날씨 표시를 위한 위치 정보">
        <p>
          화면의 날씨를 보여 주기 위해, 보호자가 휴대폰의 위치 권한을 허용한
          경우에만 대략적인 위치를 사용합니다.
        </p>
        <LegalList>
          <li>
            좌표는 약 100m 단위로 반올림해 이 휴대폰의 브라우저 저장소에만
            보관합니다.
          </li>
          <li>
            날씨를 불러올 때 좌표가 서비스 서버로 전달되며, 서버는 이를 약
            5km 크기의 기상청 격자 번호로 바꿔 기상청에 날씨를 물어봅니다.
            기상청에는 격자 번호만 전달됩니다.
          </li>
          <li>
            좌표는 서비스 데이터베이스에 저장하지 않으며, 다른 이용자에게도
            보이지 않습니다. 다만 요청 과정에서 호스팅 업체의 접속 기록에
            잠시 남을 수 있습니다.
          </li>
          <li>
            위치 권한을 허용하지 않아도 서비스를 이용할 수 있으며, 이 경우
            날씨만 표시되지 않습니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. 개인정보를 이용하는 목적">
        <LegalList>
          <li>회원 식별, 로그인, 비밀번호 재설정 등 계정 관리</li>
          <li>
            아이의 현재 장소·상태를 같은 그룹의 보호자에게 보여 주기, 그룹과
            보호자 초대 기능 제공
          </li>
          <li>그룹 채팅과 1:1 채팅 제공</li>
          <li>친구의 상태 변경이나 새 메시지를 푸시 알림으로 알려 주기</li>
          <li>현재 위치의 날씨 표시</li>
          <li>문의 응대, 부정 이용 방지, 서비스 안정성 확보</li>
        </LegalList>
        <p>
          서비스는 광고나 마케팅 목적으로 개인정보를 이용하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="4. 함께 보는 사람">
        <p>
          서비스의 성격상, 아이가 들어가 있는 그룹의 다른 보호자는 그 아이의
          이름, 현재 상태와 바뀐 시각, 보호자가 보낸 채팅 메시지를 볼 수
          있습니다. 1:1 채팅은 두 아이의 보호자만 볼 수 있습니다. 그 외의
          제3자에게는 개인정보를 제공하지 않습니다. 다만 법령에 따라 수사기관
          등이 적법한 절차로 요구하는 경우는 예외로 합니다.
        </p>
      </LegalSection>

      <LegalSection title="5. 보관 기간과 파기">
        <p>
          개인정보는 <b>회원 탈퇴 시까지</b> 보관하며, 탈퇴하면 아래와 같이
          지체 없이 삭제합니다.
        </p>
        <LegalList>
          <li>계정 정보(이메일, 암호화된 비밀번호, 동의 기록): 즉시 삭제</li>
          <li>
            나 혼자 보호자로 등록된 아이: 아이 이름, 현재 상태, 그룹 참여
            기록, 그 아이의 1:1 대화를 삭제합니다. 그 아이만 남아 있던 그룹도
            삭제됩니다.
          </li>
          <li>
            다른 보호자와 함께 등록한 아이: 다른 보호자를 위해 아이 정보는
            남고, 나와의 연결만 삭제됩니다.
          </li>
          <li>
            내가 보낸 그룹 채팅·1:1 채팅 메시지, 내가 등록한 장소, 내가 만든
            보호자 초대 링크, 채팅 읽음 기록, 알림 설정, 푸시 알림 기기 토큰:
            즉시 삭제
          </li>
          <li>
            내가 만든 그룹에 다른 아이가 남아 있는 경우: 그룹은 남은 가족을
            위해 유지되고, 관리 권한은 그 그룹의 다른 보호자에게 넘어갑니다.
          </li>
        </LegalList>
        <p>
          아이의 현재 상태는 새로 고르면 덮어쓰이고 매일 자정(한국 시간)에
          &lsquo;집&rsquo;으로 초기화되며, 지난 상태 기록은 따로 남기지
          않습니다. 회원 탈퇴 없이 &lsquo;아이 지우기&rsquo;만 하는
          경우, 보호자들이 보낸 그룹 채팅 메시지는 보낸 사람의 계정에 남고
          아이와의 연결만 지워집니다.
        </p>
        <p>
          삭제된 정보는 서비스 업체의 데이터베이스 백업이나 접속 기록에 각
          업체가 정한 기간 동안 남아 있다가 자동으로 지워질 수 있습니다. 관계
          법령에 따라 보관해야 하는 정보가 생기면 그 기간 동안만 따로
          보관합니다. 전자 파일은 복구할 수 없는 방법으로 삭제합니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 처리 위탁과 국외 이전">
        <p>
          서비스는 운영을 위해 아래 업체에 개인정보 처리를 맡기며, 이 업체들의
          서버는 국외에 있을 수 있습니다. 정보는 서비스를 이용할 때마다
          암호화된 인터넷 통신(HTTPS)으로 전송되며, 회원 탈퇴 또는 위탁 계약
          종료 시까지 보관됩니다.
        </p>
        <LegalList>
          <li>
            <b>Supabase Inc.</b> (데이터 저장 위치: 일본 도쿄, ap-northeast-1) —
            회원 인증, 데이터베이스 저장. 위 1번의 계정·아이·그룹·장소·상태·채팅
            정보와 기기 토큰. 문의:{" "}
            <a href="https://supabase.com/privacy" className="text-blue-900 underline" target="_blank" rel="noopener noreferrer">
              supabase.com/privacy
            </a>
          </li>
          <li>
            <b>Vercel Inc.</b> (미국 등) — 웹 서비스 호스팅과 서버 실행. 서비스
            이용 중 오가는 정보와 접속 기록. 문의:{" "}
            <a href="https://vercel.com/legal/privacy-policy" className="text-blue-900 underline" target="_blank" rel="noopener noreferrer">
              vercel.com/legal/privacy-policy
            </a>
          </li>
          <li>
            <b>Google LLC</b> (Firebase Cloud Messaging, 미국 등) — 푸시 알림
            전송. 기기 토큰과 알림 내용(그룹 이름, 아이 이름, 장소, 메시지
            미리보기). 문의:{" "}
            <a href="https://firebase.google.com/support/privacy" className="text-blue-900 underline" target="_blank" rel="noopener noreferrer">
              firebase.google.com/support/privacy
            </a>
          </li>
        </LegalList>
        <p>
          날씨 정보는 <b>기상청 공공데이터 API</b>(대한민국)에서 받아옵니다.
          기상청에는 약 5km 단위의 격자 번호만 전달되며, 이것만으로는 개인을
          알아볼 수 없습니다.
        </p>
        <p>
          국외 이전을 원하지 않으면 회원 탈퇴로 처리를 멈출 수 있습니다. 위
          업체 없이는 서비스를 제공할 수 없어 탈퇴 외의 거부 방법은 없습니다.
          푸시 알림은 설정에서 끌 수 있으며, 끄면 알림이 전송되지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="7. 만 14세 미만 아동의 개인정보">
        <p>
          서비스는 보호자를 위한 서비스이며, 아이가 직접 가입하지 않습니다.
          만 14세 미만 아이의 정보(이름, 상태 등)는 보호자가 직접 등록하며,
          보호자는 회원가입 시 법정대리인으로서 아이 정보의 수집·이용에
          동의합니다. 보호자는 언제든지 설정에서 아이 정보를 지우거나 회원
          탈퇴로 모든 정보를 삭제할 수 있습니다. 아이의 법정대리인이 아닌
          사람은 아이 정보를 등록해서는 안 됩니다.
        </p>
      </LegalSection>

      <LegalSection title="8. 이용자와 법정대리인의 권리">
        <p>
          이용자와 법정대리인은 언제든지 자신과 아이의 개인정보를 열람,
          정정, 삭제하거나 처리 정지를 요구할 수 있고, 동의를 철회할 수
          있습니다.
        </p>
        <LegalList>
          <li>아이 지우기, 그룹 나가기, 알림 끄기: 앱의 설정 화면</li>
          <li>모든 정보 삭제와 동의 철회: 설정 &gt; 계정 &gt; 회원탈퇴</li>
          <li>
            그 밖의 요청: 아래 연락처로 보내 주시면 지체 없이 처리하고 결과를
            알려 드립니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="9. 휴대폰(브라우저)에 저장하는 정보">
        <p>
          서비스는 광고·분석용 쿠키를 쓰지 않습니다. 기능을 위해 아래 정보만
          이 휴대폰의 브라우저에 저장합니다.
        </p>
        <LegalList>
          <li>로그인 유지를 위한 인증 쿠키</li>
          <li>
            브라우저 저장소(localStorage): 이 기기의 푸시 알림 토큰, 날씨용
            대략적인 좌표, 마지막으로 받은 날씨, 앱 설치 안내 &lsquo;다시 보지
            않기&rsquo; 여부
          </li>
          <li>세션 저장소(sessionStorage): 권한 안내·설치 안내를 이미 봤는지 여부</li>
        </LegalList>
        <p>
          브라우저 설정에서 사이트 데이터를 지우면 삭제되며, 회원 탈퇴 시 이
          휴대폰에 저장된 서비스 정보도 함께 지웁니다.
        </p>
      </LegalSection>

      <LegalSection title="10. 안전하게 지키기 위한 조치">
        <LegalList>
          <li>모든 통신은 HTTPS로 암호화합니다.</li>
          <li>비밀번호는 복원할 수 없는 방식으로 저장합니다.</li>
          <li>
            데이터베이스 행 단위 접근 제어(RLS)로, 같은 그룹의 보호자만 아이
            정보를 볼 수 있게 합니다.
          </li>
          <li>
            관리용 키는 서버에만 두고, 개인정보에 접근할 수 있는 사람을
            운영자로 한정합니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="11. 개인정보 보호책임자와 문의">
        <LegalList>
          <li>개인정보 보호책임자: 김용후</li>
          <li>연락처: {CONTACT}</li>
        </LegalList>
        <p>
          개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수
          있습니다.
        </p>
        <LegalList>
          <li>개인정보침해신고센터: privacy.kisa.or.kr / 국번 없이 118</li>
          <li>개인정보분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
          <li>대검찰청: www.spo.go.kr / 국번 없이 1301</li>
          <li>경찰청: ecrm.police.go.kr / 국번 없이 182</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="12. 방침의 변경">
        <p>
          이 방침은 {LEGAL_VERSION}부터 시행합니다. 내용이 바뀌면 시행 7일
          전(이용자에게 불리한 변경은 30일 전)에 서비스 화면을 통해 알려
          드립니다.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

# Supabase 인증 메일 한글 템플릿

Supabase 대시보드 → **Authentication → Emails (Email Templates)** 에서 템플릿별로 **Subject**와 **Message body**를 아래 내용으로 바꿔 넣고 저장하세요. `{{ ... }}` 부분은 Supabase가 자동으로 채우니 그대로 두세요.

---

## 1. Confirm signup (가입 확인)

**Subject**

```
[나랑 놀자] 가입을 완료해주세요 🛝
```

**Message body**

```html
<div style="background:#FEF3C7;padding:32px 16px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:3px solid #1F2937;border-radius:20px;padding:28px 24px;text-align:center;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#BE185D;">나랑 놀자에 오신 걸 환영해요 🎈</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1F2937;">
      아래 버튼을 누르면 가입이 완료돼요.<br />
      이제 친구들과 놀이 상태를 실시간으로 나눠보세요!
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#F9A8D4;color:#831843;text-decoration:none;font-size:17px;font-weight:bold;padding:12px 28px;border:3px solid #1F2937;border-radius:16px;">
      가입 완료하기 ✨
    </a>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6B7280;">
      버튼이 안 눌리면 아래 주소를 브라우저에 붙여넣어 주세요.<br />
      <span style="word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">
      직접 가입하신 게 아니라면 이 메일은 무시하셔도 돼요.
    </p>
  </div>
</div>
```

---

## 2. Reset password (비밀번호 재설정)

**Subject**

```
[나랑 놀자] 비밀번호 재설정 안내
```

**Message body**

```html
<div style="background:#FEF3C7;padding:32px 16px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:3px solid #1F2937;border-radius:20px;padding:28px 24px;text-align:center;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#BE185D;">비밀번호를 다시 정해요 🔑</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1F2937;">
      아래 버튼을 눌러 새 비밀번호를 설정해주세요.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#93C5FD;color:#1E3A8A;text-decoration:none;font-size:17px;font-weight:bold;padding:12px 28px;border:3px solid #1F2937;border-radius:16px;">
      비밀번호 재설정하기
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;">
      요청하지 않으셨다면 이 메일은 무시하셔도 돼요. 비밀번호는 바뀌지 않아요.
    </p>
  </div>
</div>
```

---

## 3. Change email address (이메일 변경)

**Subject**

```
[나랑 놀자] 이메일 변경을 확인해주세요
```

**Message body**

```html
<div style="background:#FEF3C7;padding:32px 16px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:3px solid #1F2937;border-radius:20px;padding:28px 24px;text-align:center;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#BE185D;">이메일을 바꿀까요? 📮</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1F2937;">
      <b>{{ .Email }}</b> 에서 <b>{{ .NewEmail }}</b> 로<br />이메일을 바꾸려면 아래 버튼을 눌러주세요.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#F9A8D4;color:#831843;text-decoration:none;font-size:17px;font-weight:bold;padding:12px 28px;border:3px solid #1F2937;border-radius:16px;">
      이메일 변경 확인
    </a>
  </div>
</div>
```

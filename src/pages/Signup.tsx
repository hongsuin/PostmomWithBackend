import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Paperclip } from 'lucide-react';
import { getOAuthRedirectUrl, getSupabaseBrowserClient } from '../lib/supabase';
import { USER_TYPE_META } from '../types/user';
import type { UserType } from '../types/user';

//백엔드 서버로 바꿀 때, supabase 관련 부분은 API 호출로 변경 필요 (예: axios.post('/api/signup', { ... }))
// ── 유형 선택 카드 목록 ──────────────────────────────────────────
const TYPE_LIST: UserType[] = ['student', 'parent', 'academy'];

// ── 비디오 배경 ─────────────────────────────────────────────────
function VideoBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover">
        <source src="/correctvideo.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 to-white/90" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  // 폼 상태
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    academyName: '',
    bizNumber: '',
  });
  const [bizFile, setBizFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  // ── 유효성 검사 ─────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))
      e.email = '올바른 이메일을 입력해주세요';
    if (!form.password || form.password.length < 6)
      e.password = '비밀번호는 6자 이상이어야 합니다';
    if (form.password !== form.confirm)
      e.confirm = '비밀번호가 일치하지 않습니다';
    return e;
  };

  // ── 가입 후 이동 경로 ────────────────────────────────────────────
  const getRedirectPath = (type: UserType) =>
    type === 'academy' ? '/login' : '/onboarding/1';

  // ── 이메일 가입 ─────────────────────────────────────────────────
  const handleSignup = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!selectedType) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            userType: selectedType,
            ...(selectedType === 'academy' && {
              academyName: form.academyName || null,
              bizNumber: form.bizNumber || null,
            }),
          },
        },
      });
      if (error) throw error;
      navigate(getRedirectPath(selectedType), { replace: true });
    } catch (err) {
      console.error(err);
      setErrors({ submit: '가입에 실패했어요. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── 카카오 가입 ─────────────────────────────────────────────────
  const handleKakaoSignup = async () => {
    if (!selectedType) return;
    setOauthError('');
    setIsKakaoLoading(true);

    // OAuth 완료 후 AuthCallback에서 읽을 수 있도록 임시 저장
    localStorage.setItem('pendingUserType', selectedType);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: getOAuthRedirectUrl(),
          scopes: 'profile_nickname account_email',
        },
      });
      if (error) throw error;
    } catch (err) {
      localStorage.removeItem('pendingUserType');
      setOauthError('카카오 가입을 시작하지 못했어요. 다시 시도해주세요.');
      setIsKakaoLoading(false);
      console.error(err);
    }
  };

  // ── STEP 1: 유형 선택 ───────────────────────────────────────────
  if (step === 'type') {
    return (
      <VideoBackground>
        <div className="max-w-[480px] mx-auto px-6 pt-16 pb-10 min-h-screen flex flex-col">
          {/* 헤더 */}
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-1">
              회원가입
            </p>
            <h1 className="font-lora text-2xl font-semibold text-slate-900 leading-tight">
              어떤 유형으로 가입하시나요?
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              본인이 해당하시는 유형을 선택해주세요.
            </p>
          </div>

          {/* 유형 카드 */}
          <div className="flex flex-col gap-3 flex-1">
            {TYPE_LIST.map((type) => {
              const meta = USER_TYPE_META[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    setStep('form');
                  }}
                  className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200
                    hover:border-primary hover:bg-primary/5 hover:shadow-md
                    focus:outline-none focus:ring-2 focus:ring-primary/30
                    ${isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-slate-200 bg-white/80 backdrop-blur-sm'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-base">{meta.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{meta.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                        ${isSelected ? 'border-primary bg-primary' : 'border-slate-300'}`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary font-semibold">로그인</Link>
          </p>
        </div>
      </VideoBackground>
    );
  }

  // ── STEP 2: 가입 방법 선택 ──────────────────────────────────────
  const meta = selectedType ? USER_TYPE_META[selectedType] : null;

  return (
    <VideoBackground>
      <div className="max-w-[480px] mx-auto px-6 pt-10 pb-10 min-h-screen flex flex-col">

        {/* 뒤로가기 + 선택된 유형 칩 */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => { setStep('type'); setErrors({}); setOauthError(''); }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
            유형 변경
          </button>
          {meta && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              {meta.emoji} {meta.label}
            </span>
          )}
        </div>

        {/* 헤더 */}
        <div className="mb-7">
          <h1 className="font-lora text-2xl font-semibold text-slate-900 leading-tight">
            가입 방법을 선택해주세요
          </h1>
        </div>

        {/* 카카오 버튼 */}
        <button
          type="button"
          onClick={() => void handleKakaoSignup()}
          disabled={isKakaoLoading}
          className="w-full bg-[#FEE500] text-slate-900 py-4 rounded-2xl font-semibold text-sm
            hover:brightness-95 transition-all duration-200 active:scale-[0.99]
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isKakaoLoading ? '카카오 연결 중...' : '카카오로 시작하기'}
        </button>
        {oauthError && (
          <p className="text-center text-xs text-red-500 mt-2">{oauthError}</p>
        )}

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">또는 이메일로 가입</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* 이메일 폼 */}
        <div className="space-y-4">
          {/* 이메일 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="이메일을 입력해주세요"
              className={`w-full bg-white/80 backdrop-blur-sm border rounded-2xl px-4 py-3.5 text-sm
                focus:outline-none shadow-sm transition-colors
                ${errors.email ? 'border-red-400' : 'border-slate-200 focus:border-primary'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="6자 이상 입력해주세요"
              className={`w-full bg-white/80 backdrop-blur-sm border rounded-2xl px-4 py-3.5 text-sm
                focus:outline-none shadow-sm transition-colors
                ${errors.password ? 'border-red-400' : 'border-slate-200 focus:border-primary'}`}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 확인</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="비밀번호를 다시 입력해주세요"
              className={`w-full bg-white/80 backdrop-blur-sm border rounded-2xl px-4 py-3.5 text-sm
                focus:outline-none shadow-sm transition-colors
                ${errors.confirm ? 'border-red-400' : 'border-slate-200 focus:border-primary'}`}
            />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          {/* 학원/기업 전용 추가 필드 */}
          {selectedType === 'academy' && (
            <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                🏫 학원 정보 <span className="font-normal normal-case text-slate-400">(선택 입력)</span>
              </p>

              {/* 학원명 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">학원명</label>
                <input
                  type="text"
                  value={form.academyName}
                  onChange={e => setForm(f => ({ ...f, academyName: e.target.value }))}
                  placeholder="학원 이름을 입력해주세요"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm
                    focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* 사업자번호 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">사업자 번호</label>
                <input
                  type="text"
                  value={form.bizNumber}
                  onChange={e => setForm(f => ({ ...f, bizNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="숫자 10자리"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm
                    focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* 사업자 등록증 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">사업자 등록증</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm
                    text-slate-500 hover:border-primary hover:text-primary transition-colors text-left"
                >
                  <Paperclip size={14} />
                  {bizFile ? bizFile.name : 'PDF 또는 이미지 파일 첨부'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={e => setBizFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          {errors.submit && (
            <p className="text-center text-xs text-red-500">{errors.submit}</p>
          )}
        </div>

        {/* 가입하기 버튼 */}
        <button
          type="button"
          onClick={() => void handleSignup()}
          disabled={isLoading}
          className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-semibold text-sm
            hover:bg-primary/90 transition-all duration-200 active:scale-[0.99]
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? '가입 중...' : '가입하기'}
        </button>

        <p className="text-center text-sm text-slate-500 mt-4">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary font-semibold">로그인</Link>
        </p>
      </div>
    </VideoBackground>
  );
}

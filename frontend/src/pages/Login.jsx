import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, User, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import CustomSelect from '../components/CustomSelect';
import api from '../utils/api';

const SECURITY_QUESTIONS = [
  { id: 'place', text: 'What is your favorite place?' },
  { id: 'pet', text: 'What is your favorite pet?' },
  { id: 'food', text: 'What is your favorite food?' },
  { id: 'movie', text: 'What is your favorite movie?' }
];

const Login = () => {
  const navigate = useNavigate();
  const { users, setUsers, setCurrentUser } = useContext(AppContext);
  
  const [step, setStep] = useState('login'); // 'login' | 'setup'
  
  // Login State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  
  // Setup State
  const [sq1, setSq1] = useState('place');
  const [sa1, setSa1] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tempUser, setTempUser] = useState(null);
  
  const [selectedQuestion, setSelectedQuestion] = useState('place');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const routeUser = (role) => {
    navigate('/app');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const currentLoginId = e.target.loginId?.value || loginId;
      const currentPassword = e.target.password?.value || password;

      const response = await api.post('/auth/login', {
        mailid: currentLoginId,
        password: currentPassword
      });
      
      const foundUser = response.data.user;
      
      if (foundUser.firstLogin) {
        setTempUser(foundUser);
        setStep('setup');
      } else {
        localStorage.setItem('token', response.data.token);
        setCurrentUser(foundUser);
        routeUser(foundUser.role);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('An error occurred during login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const questionText = SECURITY_QUESTIONS.find(q => q.id === sq1)?.text || 'Security Question';
      
      await api.post(`/auth/setup/${tempUser.id}`, {
        password: newPassword,
        securityQuestions: [
          { id: sq1, text: questionText, answer: sa1 }
        ]
      });
      
      const res = await api.get('/users');
      setUsers(res.data);
      
      setStep('setup_success');
      setLoginId('');
      setPassword('');
      setTempUser(null);
    } catch (err) {
      console.error('Error in setup submit:', err);
      setError('An error occurred during setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordId = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const res = await api.get(`/auth/security-questions/${loginId}`);
      
      setTempUser({ ...tempUser, normalizedQuestions: res.data.questions });
      setStep('forgot_password_qa');
      setSecurityAnswer('');
      setSelectedQuestion(res.data.questions[0]?.id || 'place');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('User not found or an error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordQA = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/verify-security-answer', {
        loginId: loginId,
        questionId: selectedQuestion,
        answer: securityAnswer
      });
      
      if (res.data.valid) {
        setStep('reset_password');
        setNewPassword(''); setConfirmPassword('');
      } else {
        setError('Incorrect security question or answer');
      }
    } catch (err) {
      setError('An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.post('/auth/reset-password', {
        loginId: loginId,
        newPassword: newPassword
      });
      
      setStep('login');
      setSuccessMsg('Password reset successfully. Please login.');
      setPassword('');
    } catch (error) {
      setError('Failed to reset password. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 relative z-10 border border-slate-100 animate-slide-up">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-6 transition-transform duration-300 ${step === 'setup' ? 'bg-gradient-to-tr from-emerald-500 to-emerald-400 shadow-emerald-500/30' : 'bg-gradient-to-tr from-brand-600 to-brand-400 shadow-brand-500/30 group hover:scale-105'}`}>
            {step === 'setup' ? (
              <ShieldCheck className="text-white w-8 h-8" />
            ) : (
              <Package className="text-white w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            {step === 'setup' ? 'Account Setup' : step === 'setup_success' ? 'Setup Complete!' : step.startsWith('forgot') || step === 'reset_password' ? 'Password Reset' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500">
            {step === 'setup' ? 'Please complete your security profile' : step === 'setup_success' ? 'Your account is ready to use' : step === 'forgot_password_id' ? 'Enter your email or emp code' : step === 'forgot_password_qa' ? 'Answer your security questions' : step === 'reset_password' ? 'Set your new password' : 'Sign in to AssetFlow to continue'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
            <ShieldCheck size={16} />
            {successMsg}
          </div>
        )}

        {step === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Email or Emp Code</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  name="loginId"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 hover:border-slate-300 transition-all text-slate-700 font-medium shadow-sm"
                  placeholder="name@company.com or 123456"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 block text-left">Password</label>
                <button type="button" onClick={() => { setStep('forgot_password_id'); setError(''); setSuccessMsg(''); setLoginId(''); }} className="text-xs font-medium text-brand-600 hover:text-brand-500">Forgot Password?</button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 hover:border-slate-300 transition-all text-slate-700 font-medium shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign in to workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : step === 'setup' ? (
          <form onSubmit={handleSetupSubmit} className="space-y-5 animate-fade-in max-h-[60vh] overflow-y-auto px-1 pb-4">
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Security Question</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 block text-left">Select a Question</label>
                <div className="mb-2">
                  <CustomSelect
                    name="sq1"
                    options={SECURITY_QUESTIONS.map(q => ({value: q.id, label: q.text}))}
                    value={sq1}
                    onChange={(e) => setSq1(e.target.value)}
                    placeholder="Select a Question"
                  />
                </div>
                <input type="text" required value={sa1} onChange={(e) => setSa1(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium transition-all" placeholder="Your answer" />
              </div>
            </div>

            <div className="relative flex items-center py-2 mt-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Set Password</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">New Password</label>
              <input type="password" required minLength="6" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Confirm Password</label>
              <div className="relative">
                <input type="password" required minLength="6" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Re-enter password" />
                {confirmPassword && newPassword === confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none animate-in zoom-in duration-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button 
                type="button" 
                onClick={() => { setStep('login'); setError(''); setSuccessMsg(''); }}
                className="w-1/3 flex items-center justify-center py-2.5 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>
        ) : step === 'forgot_password_id' ? (
          <form onSubmit={handleForgotPasswordId} className="space-y-5 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Email or Emp Code</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium"
                  placeholder="name@company.com or 123456"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button type="button" onClick={() => { setStep('login'); setError(''); setSuccessMsg(''); }} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors mt-4">
              Back to login
            </button>
          </form>
        ) : step === 'forgot_password_qa' ? (
          <form onSubmit={handleForgotPasswordQA} className="space-y-5 animate-fade-in max-h-[60vh] overflow-y-auto px-1 pb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Security Question</label>
              <CustomSelect
                name="selectedQuestion"
                options={(tempUser?.normalizedQuestions || []).map(q => ({value: q.id, label: q.text}))}
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                placeholder="Select Security Question"
                disabled={(tempUser?.normalizedQuestions || []).length <= 1}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Your Answer</label>
              <input 
                type="text" 
                required 
                value={securityAnswer} 
                onChange={(e) => setSecurityAnswer(e.target.value)} 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium transition-all" 
                placeholder="Type your answer" 
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 mt-6 shadow-lg shadow-brand-500/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button type="button" onClick={() => { setStep('login'); setError(''); setSuccessMsg(''); }} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors mt-4">
              Back to login
            </button>
          </form>
        ) : step === 'reset_password' ? (
          <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in max-h-[60vh] overflow-y-auto px-1 pb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">New Password</label>
              <input type="password" required minLength="6" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Confirm Password</label>
              <div className="relative">
                <input type="password" required minLength="6" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Re-enter password" />
                {confirmPassword && newPassword === confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none animate-in zoom-in duration-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 mt-6 shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button type="button" onClick={() => { setStep('login'); setError(''); setSuccessMsg(''); }} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors mt-4">
              Back to login
            </button>
          </form>
        ) : step === 'setup_success' ? (
          <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in py-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800">You have successfully set your password!</h3>
              <p className="text-slate-500 text-sm">Your security question and password have been saved securely. You can now use your new password to access your account.</p>
            </div>
            <button 
              onClick={() => { setStep('login'); setError(''); setSuccessMsg(''); }}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-all active:scale-[0.98] mt-4 shadow-lg shadow-slate-900/20"
            >
              Okay, Back to Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Login;


const { useState, useEffect, useCallback } = React;

const EXAM_SIZE = 30;
const STATS_KEY = 'qianchuan_exam_v1.5_mobile';

const App = () => {
  const [view, setView] = useState('home');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [finalResult, setFinalResult] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) setStats(JSON.parse(saved));
  }, []);

  const startExam = useCallback(() => {
    const weightedPool = [];
    window.QUESTION_BANK.forEach(q => {
      const qStat = stats[q.id] || { correct: 0, total: 0 };
      let effectiveWeight = q.weight;
      if (qStat.total >= 3) {
        const accuracy = qStat.correct / qStat.total;
        if (accuracy > 0.8) effectiveWeight = Math.max(0.1, q.weight * (1.1 - accuracy));
      }
      const slots = Math.max(1, Math.round(effectiveWeight * 10));
      for (let i = 0; i < slots; i++) weightedPool.push(q);
    });

    const shuffled = weightedPool.sort(() => Math.random() - 0.5);
    const selected = [];
    const ids = new Set();
    for (const q of shuffled) {
      if (!ids.has(q.id)) { selected.push(q); ids.add(q.id); }
      if (selected.length === EXAM_SIZE || selected.length === window.QUESTION_BANK.length) break;
    }
    setQuestions(selected);
    setUserAnswers([]);
    setCurrentIndex(0);
    setStartTime(Date.now());
    setView('exam');
    window.scrollTo(0, 0);
  }, [stats]);

  const handleSelect = (val) => {
    const qId = questions[currentIndex].id;
    const existing = userAnswers.filter(a => a.questionId !== qId);
    setUserAnswers([...existing, { questionId: qId, selected: val }]);
  };

  const submit = () => {
    let correct = 0;
    const newStats = { ...stats };
    questions.forEach(q => {
      const u = userAnswers.find(a => a.questionId === q.id);
      const isCorrect = u && (Array.isArray(q.answer) 
        ? JSON.stringify([...u.selected].sort()) === JSON.stringify([...q.answer].sort())
        : u.selected === q.answer);
      if (isCorrect) correct++;
      if (!newStats[q.id]) newStats[q.id] = { correct: 0, total: 0 };
      newStats[q.id].total++;
      if (isCorrect) newStats[q.id].correct++;
    });
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    setFinalResult({ score: Math.round((correct / questions.length) * 100), correctCount: correct, timeTaken: Math.floor((Date.now() - startTime) / 1000) });
    setView('result');
  };

  if (view === 'home') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <i className="fa-solid fa-graduation-cap text-3xl text-white"></i>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">千川认证模拟练习</h1>
        <p className="text-slate-400 mb-8 text-sm">真题注入 · 权重抽题 · 手机适配</p>
        <button onClick={startExam} className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-lg">
          开始 30 题模拟考试
        </button>
      </div>
    </div>
  );

  if (view === 'exam') {
    const q = questions[currentIndex];
    const userAns = userAnswers.find(a => a.questionId === q.id)?.selected;
    return (
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 bg-white shadow-sm p-4 z-10 flex items-center justify-between">
          <button onClick={() => setView('home')} className="text-slate-400"><i className="fa-solid fa-xmark text-xl"></i></button>
          <span className="font-bold text-blue-600">{currentIndex + 1} / {questions.length}</span>
          <div className="w-20 bg-slate-100 h-1.5 rounded-full"><div className="bg-blue-600 h-full rounded-full transition-all" style={{width:`${(currentIndex+1)/questions.length*100}%`}}></div></div>
        </div>
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50 mb-6">
            <div className="flex gap-2 mb-4">
              <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded font-bold">{q.type}</span>
              {q.weight === 3 && <span className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded font-bold">高频考点</span>}
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-8">{q.text}</h2>
            <div className="space-y-4">
              {(q.options || ['A. 正确', 'B. 错误']).map(opt => {
                const key = opt.charAt(0);
                const isSelected = Array.isArray(userAns) ? userAns.includes(key) : userAns === key;
                return (
                  <button key={key} onClick={() => {
                    if(q.type === 'MULTIPLE') {
                      const cur = userAns || [];
                      handleSelect(cur.includes(key) ? cur.filter(k=>k!==key) : [...cur, key]);
                    } else handleSelect(key);
                  }} className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border'}`}>{key}</div>
                    <span className="flex-1 font-medium">{opt.split(/[、.]/)[1] || opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md flex gap-4">
            <button disabled={currentIndex === 0} onClick={()=>setCurrentIndex(currentIndex-1)} className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold disabled:opacity-30">上一题</button>
            {currentIndex === questions.length - 1 
              ? <button onClick={submit} className="flex-[2] py-4 rounded-2xl bg-green-600 text-white font-bold">提交评分</button>
              : <button onClick={()=>setCurrentIndex(currentIndex+1)} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-bold">下一题</button>
            }
          </div>
        </div>
      </div>
    );
  }

  if (view === 'result') return (
    <div className="min-h-screen p-4 animate-fadeIn">
      <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className={`p-10 text-center text-white ${finalResult.score >= 60 ? 'bg-green-500' : 'bg-rose-500'}`}>
          <h2 className="text-8xl font-black mb-2">{finalResult.score}</h2>
          <p className="font-bold opacity-80">考试用时：{Math.floor(finalResult.timeTaken/60)}分{finalResult.timeTaken%60}秒</p>
        </div>
        <div className="p-8 text-center">
          <button onClick={()=>setView('home')} className="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl">返回首页继续练习</button>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

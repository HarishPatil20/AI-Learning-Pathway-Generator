import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Sparkles, 
  GraduationCap, 
  ArrowRight, 
  Loader2, 
  BookOpen, 
  Target,
  BrainCircuit,
  RefreshCw,
  Layers,
  LogIn,
  LogOut,
  History,
  Video,
  Upload,
  Play,
  X,
  Image as ImageIcon,
  Scan,
  Wand2
} from 'lucide-react';
import { generateLearningRoadmap, RoadmapResponse, generateVeoVideo, analyzeImage, generateImage } from './services/geminiService';
import { RoadmapCard } from './components/RoadmapCard';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'lab'>('roadmap');
  
  // Roadmap state
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [skills, setSkills] = useState('');
  const [mode, setMode] = useState<'fast' | 'deep'>('fast');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapResponse & { id?: string, videoUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Veo state
  const [veoLoading, setVeoLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // AI Lab state
  const [labMode, setLabMode] = useState<'analyze' | 'generate'>('analyze');
  const [labImage, setLabImage] = useState<File | null>(null);
  const [labImagePreview, setLabImagePreview] = useState<string | null>(null);
  const [labPrompt, setLabPrompt] = useState('');
  const [labResult, setLabResult] = useState<{ type: 'text' | 'image', content: string } | null>(null);
  const [labLoading, setLabLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchHistory(u.uid);
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'roadmaps'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  const logout = () => signOut(auth);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await generateLearningRoadmap(goal, level, skills, mode);
      
      let videoUrl = '';
      if (selectedImage) {
        setVeoLoading(true);
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(selectedImage);
          });
          const base64 = await base64Promise;
          videoUrl = await generateVeoVideo(base64, selectedImage.type, `A cinematic learning journey about ${goal}`);
        } catch (vErr) {
          console.error("Veo failed:", vErr);
        } finally {
          setVeoLoading(false);
        }
      }

      const roadmapData = {
        ...result,
        videoUrl,
        userId: user?.uid || 'anonymous',
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      };

      if (user) {
        const docRef = await addDoc(collection(db, 'roadmaps'), roadmapData);
        setRoadmap({ ...roadmapData, id: docRef.id });
        fetchHistory(user.uid);
      } else {
        setRoadmap(roadmapData);
      }
    } catch (err) {
      setError('Failed to generate roadmap. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRoadmap(null);
    setGoal('');
    setSkills('');
    setLevel('Beginner');
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: import('react').ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLabAction = async (e: FormEvent) => {
    e.preventDefault();
    if (labMode === 'analyze' && (!labImage || !labPrompt)) return;
    if (labMode === 'generate' && !labPrompt) return;

    setLabLoading(true);
    setError(null);
    try {
      if (labMode === 'analyze' && labImage) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(labImage);
        });
        const base64 = await base64Promise;
        const result = await analyzeImage(base64, labImage.type, labPrompt);
        setLabResult({ type: 'text', content: result });
      } else if (labMode === 'generate') {
        let base64 = '';
        let mimeType = '';
        if (labImage) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(labImage);
          });
          base64 = await base64Promise;
          mimeType = labImage.type;
        }
        const result = await generateImage(labPrompt, base64, mimeType);
        setLabResult({ type: 'image', content: result });
      }
    } catch (err) {
      setError('AI Lab operation failed. Please try again.');
      console.error(err);
    } finally {
      setLabLoading(false);
    }
  };

  const handleLabImageChange = (e: import('react').ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLabImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLabImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span>PathwayAI</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-600"
                  title="History"
                >
                  <History className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-zinc-200" />
                  <button onClick={logout} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
            {roadmap && (
              <button 
                onClick={reset}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                New
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {!roadmap && !showHistory && (
          <div className="flex justify-center mb-12 no-print">
            <div className="flex p-1 bg-zinc-100 rounded-2xl border border-zinc-200">
              <button
                onClick={() => setActiveTab('roadmap')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'roadmap' 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Target className="w-4 h-4" />
                Roadmap
              </button>
              <button
                onClick={() => setActiveTab('lab')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'lab' 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                AI Lab
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showHistory && user ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Your Learning History</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => { setRoadmap(item); setShowHistory(false); }}
                    className="p-6 bg-white border border-zinc-200 rounded-2xl hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold group-hover:text-zinc-900">{item.learningGoal}</h3>
                      <span className="text-xs text-zinc-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Layers className="w-4 h-4" />
                      {item.steps.length} Steps
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'lab' && !roadmap ? (
            <motion.div
              key="lab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <h1 className="text-5xl font-bold tracking-tight text-zinc-900 mb-4">
                  AI Creative Lab
                </h1>
                <p className="text-zinc-500 text-lg">
                  Analyze your study materials or generate custom educational visuals.
                </p>
              </div>

              <div className="flex p-1 bg-zinc-100 rounded-2xl border border-zinc-200 mb-8">
                <button
                  onClick={() => { setLabMode('analyze'); setLabResult(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    labMode === 'analyze' 
                      ? 'bg-white text-zinc-900 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <Scan className="w-4 h-4" />
                  Analyze Image
                </button>
                <button
                  onClick={() => { setLabMode('generate'); setLabResult(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    labMode === 'generate' 
                      ? 'bg-white text-zinc-900 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Generate/Edit Image
                </button>
              </div>

              <form onSubmit={handleLabAction} className="space-y-6 bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/50">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {labMode === 'analyze' ? 'Upload Image to Analyze' : 'Reference Image (Optional)'}
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLabImageChange}
                      className="hidden"
                      id="lab-image-upload"
                    />
                    <label 
                      htmlFor="lab-image-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-900 transition-all bg-zinc-50"
                    >
                      {labImagePreview ? (
                        <img src={labImagePreview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Click to upload image</span>
                        </div>
                      )}
                    </label>
                    {labImagePreview && (
                      <button 
                        type="button"
                        onClick={() => { setLabImage(null); setLabImagePreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-zinc-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {labMode === 'analyze' ? 'What should I look for?' : 'Describe the image you want'}
                  </label>
                  <textarea
                    required
                    value={labPrompt}
                    onChange={(e) => setLabPrompt(e.target.value)}
                    placeholder={labMode === 'analyze' ? "e.g. Explain the concepts in this diagram..." : "e.g. A futuristic library with floating books..."}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all min-h-[100px]"
                  />
                </div>

                <button
                  disabled={labLoading}
                  type="submit"
                  className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {labLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {labMode === 'analyze' ? 'Analyze Image' : 'Generate Image'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {labResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 p-8 bg-white border border-zinc-200 rounded-3xl shadow-lg"
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-zinc-900" />
                    Result
                  </h3>
                  {labResult.type === 'text' ? (
                    <div className="prose prose-zinc max-w-none text-zinc-600 whitespace-pre-wrap">
                      {labResult.content}
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-zinc-100">
                      <img src={labResult.content} alt="Generated" className="w-full h-auto" />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : !roadmap ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-6"
                >
                  <Sparkles className="w-3 h-3" />
                  AI-Powered Learning
                </motion.div>
                <h1 className="text-5xl font-bold tracking-tight text-zinc-900 mb-4">
                  What do you want to master today?
                </h1>
                <p className="text-zinc-500 text-lg">
                  Enter your goal and we'll build a personalized learning journey using the best free resources on the web.
                </p>
              </div>

              <form onSubmit={handleGenerate} className="space-y-6 bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/50">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Learning Goal
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Quantum Computing, Digital Marketing, Italian Cooking"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4" />
                      Knowledge Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all bg-white"
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      AI Intelligence
                    </label>
                    <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                      <button
                        type="button"
                        onClick={() => setMode('fast')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                          mode === 'fast' 
                            ? 'bg-white text-zinc-900 shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${mode === 'fast' ? 'animate-spin-slow' : ''}`} />
                        Fast
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('deep')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                          mode === 'deep' 
                            ? 'bg-white text-zinc-900 shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                      >
                        <BrainCircuit className="w-3 h-3" />
                        Deep
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Known Skills (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Python, Basic Math"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                  />
                </div>

                {/* Veo Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Animate your goal (Optional)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-900 transition-all bg-zinc-50"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Upload an image to generate a Veo video</span>
                        </div>
                      )}
                    </label>
                    {imagePreview && (
                      <button 
                        type="button"
                        onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-zinc-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  disabled={loading || veoLoading}
                  type="submit"
                  className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {loading || veoLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {veoLoading ? "Generating Video..." : "Designing your pathway..."}
                    </>
                  ) : (
                    <>
                      Generate Roadmap
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {error && (
                  <p className="text-rose-500 text-sm text-center font-medium">
                    {error}
                  </p>
                )}
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <button 
                    onClick={reset}
                    className="p-2 rounded-full hover:bg-zinc-100 transition-colors no-print"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <h2 className="text-3xl font-bold tracking-tight">
                    Roadmap: {roadmap.learningGoal}
                  </h2>
                  <button 
                    onClick={() => window.print()}
                    className="ml-auto p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-2 text-sm font-medium no-print"
                  >
                    <BookOpen className="w-4 h-4" />
                    Save PDF
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    {roadmap.steps.length} Steps
                  </span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span>Level: {level}</span>
                </div>
              </div>

              {roadmap.videoUrl && (
                <div className="mb-12 rounded-3xl overflow-hidden border border-zinc-200 shadow-lg aspect-video bg-black">
                  <video 
                    src={roadmap.videoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="space-y-2">
                {roadmap.steps.map((step: any, index: number) => (
                  <RoadmapCard key={index} step={step} index={index} />
                ))}
              </div>

              <div className="mt-16 p-8 rounded-3xl bg-zinc-900 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to start?</h3>
                <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                  This roadmap is just the beginning. The most important step is the first one. Pick a resource and dive in!
                </p>
                <button 
                  onClick={() => window.print()}
                  className="px-8 py-3 bg-white text-zinc-900 rounded-xl font-bold hover:bg-zinc-100 transition-colors"
                >
                  Save as PDF
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-zinc-200 mt-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-zinc-400 text-sm">
            Powered by Gemini AI & Open Educational Resources. 
            <br />
            Built for lifelong learners.
          </p>
        </div>
      </footer>
    </div>
  );
}

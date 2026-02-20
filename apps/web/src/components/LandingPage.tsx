import { useState, type KeyboardEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { SeoHead } from "./SeoHead";

const FEATURES = [
  {
    icon: Users,
    title: "Real-time collaboration",
    desc: "Code with your team simultaneously with synced edits, cursors, and chat.",
    color: "from-purple-500 to-violet-600",
    glow: "group-hover:shadow-purple-500/20",
  },
  {
    icon: Cpu,
    title: "Sandboxed execution",
    desc: "Run code in isolated Docker environments with multi-language support.",
    color: "from-blue-500 to-cyan-500",
    glow: "group-hover:shadow-blue-500/20",
  },
  {
    icon: Shield,
    title: "Secure by design",
    desc: "Containers, rate limits, and isolated code execution for safer collaboration.",
    color: "from-emerald-500 to-teal-500",
    glow: "group-hover:shadow-emerald-500/20",
  },
];

const BENEFITS = [
  "Launch interview-ready coding sessions in seconds.",
  "Share one room link and start pair-programming instantly.",
  "Use built-in problem statements for guided practice.",
  "Monitor output and chat side-by-side while coding.",
];

const FAQ_ENTRIES = [
  {
    question: "What is CodeStream?",
    answer:
      "CodeStream is a real-time collaborative code editor for pair-programming, interview practice, and team coding sessions.",
  },
  {
    question: "Does CodeStream support multiple programming languages?",
    answer:
      "Yes. You can switch between JavaScript, Python, Java, C++, and Go while collaborating in the same room.",
  },
  {
    question: "Can I share coding rooms with my team?",
    answer:
      "Yes. Create a room, copy the room link or ID, and invite participants instantly for synchronized editing and chat.",
  },
];

const SEO_KEYWORDS = [
  "real-time code editor",
  "collaborative coding platform",
  "pair programming tool",
  "online interview coding editor",
  "multi-language code runner",
  "CodeStream",
  "techieraj",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const homeJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CodeStream",
      url: "https://www.techieraj.online/",
      description:
        "CodeStream is a real-time collaborative code editor for pair-programming and interview practice.",
      inLanguage: "en-US",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CodeStream",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "https://www.techieraj.online/",
      featureList: FEATURES.map((feature) => feature.title),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ENTRIES.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.answer,
        },
      })),
    },
  ];

  const createNewRoom = () => {
    setIsCreating(true);
    const id = uuidv4();
    setRoomId(id);
    toast.success("Room created");
    setTimeout(() => setIsCreating(false), 300);
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both username and room ID are required");
      return;
    }
    navigate(`/editor/${roomId}`, { state: { username } });
  };

  const handleInputEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <>
      <SeoHead
        title="CodeStream | Real-time Collaborative Code Editor"
        description="CodeStream is a real-time collaborative code editor for pair-programming, interview prep, and multi-language code execution."
        canonicalPath="/"
        keywords={SEO_KEYWORDS}
        jsonLd={homeJsonLd}
      />

      <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse-glow" />
          <div
            className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-glow"
            style={{ animationDelay: "1s" }}
          />
          <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-cyan-500/5 rounded-full blur-[100px] animate-float" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <header className="z-10">
          <nav className="flex justify-between items-center px-6 sm:px-8 py-5 w-full max-w-7xl mx-auto">
            <a href="/" className="flex items-center gap-2.5" aria-label="CodeStream homepage">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg shadow-purple-500/20">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                CodeStream
              </span>
            </a>
            <a
              href="https://github.com/HrithikRaj1999/realtime-code-editor"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              GitHub
            </a>
          </nav>
        </header>

        <main className="flex-1 flex flex-col items-center px-4 sm:px-6 z-10 relative pb-12">
          <section
            className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center pt-10 sm:pt-14"
            aria-labelledby="hero-heading"
          >
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Real-time collaborative IDE
              </div>

              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight"
              >
                Code together,
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                  real-time.
                </span>
              </h1>

              <p className="text-gray-400 text-base sm:text-lg max-w-md leading-relaxed">
                Synchronized editing, instant execution, and collaborative problem solving in one
                browser-based coding workspace.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {FEATURES.map((feature) => (
                  <article
                    key={feature.title}
                    className={`group p-5 bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all duration-300 hover:bg-white/[0.05] cursor-default ${feature.glow} hover:shadow-xl`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <feature.icon className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold mb-1">{feature.title}</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-[28px] blur-xl opacity-60" />

                <section className="relative bg-[#0c0c0c]/80 backdrop-blur-2xl border border-white/[0.08] p-7 sm:p-8 rounded-3xl shadow-2xl">
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <h2 className="text-xl font-bold">Join a Room</h2>
                    </div>
                    <p className="text-gray-500 text-sm">
                      Enter a room ID to join, or create one instantly.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                        Username
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/30 transition-all placeholder:text-gray-700 hover:border-white/[0.12]"
                        placeholder="John Doe"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                        Room ID
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all placeholder:text-gray-700 hover:border-white/[0.12]"
                        placeholder="paste-room-id-here"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                      />
                    </div>

                    <button
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 group mt-3 active:scale-[0.98] cursor-pointer"
                      onClick={joinRoom}
                    >
                      Join Room
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="text-center pt-3">
                      <span className="text-gray-600 text-sm">Do not have an invite? </span>
                      <button
                        onClick={createNewRoom}
                        type="button"
                        className={`text-purple-400 hover:text-purple-300 font-semibold text-sm hover:underline underline-offset-4 cursor-pointer transition-colors ${isCreating ? "animate-pulse" : ""}`}
                      >
                        Create New Room
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section
            id="benefits"
            className="w-full max-w-6xl mt-16 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 sm:p-8"
          >
            <h2 className="text-2xl font-bold mb-4">Why teams pick CodeStream</h2>
            <p className="text-gray-400 mb-6 max-w-3xl">
              CodeStream helps developers collaborate on coding interviews, pair-programming, and
              remote problem solving with minimal setup.
            </p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="faq" className="w-full max-w-6xl mt-12">
            <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQ_ENTRIES.map((faq) => (
                <details
                  key={faq.question}
                  className="group border border-white/[0.08] rounded-2xl p-4 bg-white/[0.02]"
                >
                  <summary className="cursor-pointer text-sm sm:text-base font-semibold text-gray-100">
                    {faq.question}
                  </summary>
                  <p className="text-sm text-gray-400 mt-2">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </main>

        <footer className="py-5 text-center text-gray-600 text-xs z-10 font-medium">
          Built with React, Socket.IO, and Redis
        </footer>
      </div>
    </>
  );
}

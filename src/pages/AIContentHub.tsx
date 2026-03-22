import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Copy, Check, Share2 } from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { generateAIContent } from "../lib/ai";

const suggestedTopics = [
  "Tax Planning for HNI",
  "GST Audit Best Practices",
  "Financial Planning 2024",
  "Audit Independence",
  "Transfer Pricing Strategy",
];

export default function AIContentHub() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<"linkedin" | "whatsapp">("linkedin");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setContent("");
    setError("");

    try {
      const output = await generateAIContent(topic.trim(), platform);
      setContent(output);
    } catch (err: any) {
      setError(err?.message || "Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    window.open(
      platform === "linkedin" ? "https://www.linkedin.com/feed/" : "https://web.whatsapp.com/",
      "_blank"
    );
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-10">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-semibold text-text-primary flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-brand" />
          AI Content Hub
        </h1>
        <p className="text-text-secondary mt-1">
          Generate professional LinkedIn posts and WhatsApp messages
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Content Settings</h3>

          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1 rounded-full text-xs bg-surface border border-border hover:bg-background transition"
              >
                {t}
              </button>
            ))}
          </div>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter content topic..."
            className="w-full mb-5 bg-transparent border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          />

          <div className="flex gap-3 mb-6">
            {["linkedin", "whatsapp"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p as "linkedin" | "whatsapp")}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                  platform === p
                    ? "bg-brand text-white"
                    : "bg-surface border border-border text-text-secondary hover:bg-background"
                }`}
              >
                {p === "linkedin" ? "LinkedIn Post" : "WhatsApp Message"}
              </button>
            ))}
          </div>

          <Button className="w-full" onClick={generate} disabled={loading || !topic.trim()}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Content
          </Button>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Generated Output</h3>

          {loading && (
            <>
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-5/6" />
            </>
          )}

          {!loading && !content && !error && (
            <p className="text-text-muted text-sm">Generated content will appear here.</p>
          )}

          {!!error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {content && (
            <>
              <div className="bg-background border border-border rounded-xl p-4 text-sm whitespace-pre-wrap text-text-secondary mb-6">
                {content}
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={copy}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>

                <Button
                  className="flex-1 bg-surface text-text-primary border border-border hover:bg-background"
                  onClick={share}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}


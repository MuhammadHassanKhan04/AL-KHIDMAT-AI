"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Send, ShieldCheck, AlertTriangle, Clock, RefreshCw, CheckCheck, User, MoreVertical, Phone, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  isImage?: boolean;
  imageUrl?: string;
  isReceipt?: boolean;
  receiptData?: any;
  timestamp: string;
}

export default function Home() {
  const getFormattedTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "As-salamu alaykum! Welcome to the Al-Khidmat Donation Verification System. Please upload your bank transfer screenshot to begin.",
      timestamp: getFormattedTime()
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // State to hold context for the final chat step
  const [extractedData, setExtractedData] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [awaitingPurpose, setAwaitingPurpose] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show image preview as user message
    const imageUrl = URL.createObjectURL(file);
    addMessage({ sender: "user", text: "Uploaded payment receipt", isImage: true, imageUrl, timestamp: getFormattedTime() });

    setIsUploading(true);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        setExtractedData(data.extracted);
        setVerificationStatus(data.status);
        
        addMessage({
          sender: "ai",
          text: "Extraction Complete. Verification Status: " + data.status,
          isReceipt: true,
          receiptData: { ...data.extracted, status: data.status },
          timestamp: getFormattedTime()
        });

        if (data.status === "VERIFIED") {
          setTimeout(() => {
            addMessage({
              sender: "ai",
              text: "Thank you for your donation. Please tell us what this donation is for (e.g., Gaza Relief, Orphan Sponsorship, General).",
              timestamp: getFormattedTime()
            });
            setAwaitingPurpose(true);
          }, 1000);
        } else {
          setTimeout(() => {
            addMessage({
              sender: "ai",
              text: "We could not match this payment with our bank records. Your attempt has been marked as mismatched. Please ensure the payment is complete.",
              timestamp: getFormattedTime()
            });
          }, 1000);
        }
      } else {
        addMessage({ sender: "ai", text: "Error: " + data.error, timestamp: getFormattedTime() });
      }
    } catch (error) {
      addMessage({ sender: "ai", text: "Failed to process the image. Please try again.", timestamp: getFormattedTime() });
    } finally {
      setIsUploading(false);
      setIsTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue;
    addMessage({ sender: "user", text: userText, timestamp: getFormattedTime() });
    setInputValue("");
    setIsTyping(true);

    if (awaitingPurpose && extractedData) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            extractedData,
            verificationStatus,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          addMessage({ sender: "ai", text: data.reply, timestamp: getFormattedTime() });
          setAwaitingPurpose(false);
          setExtractedData(null);
          setVerificationStatus(null);
        } else {
          addMessage({ sender: "ai", text: "Something went wrong saving the record.", timestamp: getFormattedTime() });
        }
      } catch (error) {
        addMessage({ sender: "ai", text: "Network error occurred.", timestamp: getFormattedTime() });
      }
    } else {
      setTimeout(() => {
        addMessage({ sender: "ai", text: "If you have a receipt to verify, please upload it using the paperclip icon.", timestamp: getFormattedTime() });
      }, 1000);
    }
    setIsTyping(false);
  };

  const addMessage = (msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: Date.now().toString() }]);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#b2ebf2] to-[#80deea] flex flex-col relative font-sans ${inter.variable}`}>
      {/* WhatsApp Background Top Green Strip */}
      <div className="absolute top-0 left-0 w-full h-32 bg-[#00a884] z-0 hidden md:block" />

      <div className="relative z-10 flex-1 md:py-8 flex items-center justify-center">
        <div className="w-full h-screen md:h-[90vh] md:max-w-4xl bg-white/20 backdrop-blur-xl md:shadow-xl md:rounded-lg flex flex-col overflow-hidden ring-1 ring-white/20">
          {/* Header */}
          <div className="h-16 bg-white/30 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111b21] font-medium leading-tight">Al-Khidmat Assistant</span>
                <span className="text-[#667781] text-xs">
                  {isTyping ? "typing..." : "online"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[#54656f]">
              <Video className="w-5 h-5 cursor-pointer hidden sm:block" />
              <Phone className="w-5 h-5 cursor-pointer hidden sm:block" />
              <div className="w-px h-6 bg-gray-300 hidden sm:block mx-1"></div>
              <MoreVertical className="w-5 h-5 cursor-pointer" />
            </div>
          </div>

          {/* Chat Area - WhatsApp Doodle Background */}
          <div 
            className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-3 bg-[#efeae2]"
            style={{ backgroundImage: "url('file:///C:/Users/ALI%20COMPUTERS/.gemini/antigravity/brain/74d7d20f-6391-4f2c-a559-5878168d0de9/chat_background_1780739526088.png')", backgroundRepeat: 'repeat', opacity: 0.95 }}
            ref={scrollRef as any}
          >
            {/* Date Badge */}
            <div className="flex justify-center mb-4">
              <span className="bg-white text-[#54656f] text-xs uppercase px-3 py-1.5 rounded-lg shadow-sm">
                Today
              </span>
            </div>

            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={"flex " + (msg.sender === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={
                      "relative max-w-[85%] sm:max-w-[70%] px-3 py-2 text-[15px] shadow-sm leading-relaxed " +
                      (msg.sender === "user"
                        ? "bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tr-none"
                        : "bg-white text-[#111b21] rounded-lg rounded-tl-none")
                    }
                  >
                    {/* Tail SVG */}
                    {msg.sender === "user" ? (
                      <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -right-2 text-[#d9fdd3]">
                        <path fill="currentColor" d="M5.188 1H0v11.156L7.969 1.562A1.5 1.5 0 0 0 6.688 1h-1.5z"></path>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white">
                        <path fill="currentColor" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                      </svg>
                    )}

                    {msg.isImage && (
                      <div className="mb-1 rounded-md overflow-hidden bg-black/5 p-1 mt-1">
                        <img src={msg.imageUrl} alt="Receipt" className="max-w-full max-h-64 object-cover rounded" />
                      </div>
                    )}
                    
                    {msg.isReceipt && msg.receiptData ? (
                      <div className="space-y-3 pb-3 mt-1">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                          {msg.receiptData.status === 'VERIFIED' && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                          {msg.receiptData.status === 'FLAGGED' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                          {msg.receiptData.status === 'PENDING' && <Clock className="w-5 h-5 text-blue-500" />}
                          <span className="font-semibold text-gray-800">Verification Result</span>
                          <Badge variant={msg.receiptData.status === 'VERIFIED' ? 'default' : 'secondary'} className="ml-auto">
                            {msg.receiptData.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[14px]">
                          <div className="text-gray-500">Amount:</div>
                          <div className="font-medium text-right">PKR {msg.receiptData.amount}</div>
                          <div className="text-gray-500">Bank:</div>
                          <div className="font-medium text-right">{msg.receiptData.bankName}</div>
                          <div className="text-gray-500">Date:</div>
                          <div className="font-medium text-right">{msg.receiptData.transactionDate}</div>
                          <div className="text-gray-500">Ref ID:</div>
                          <div className="font-medium text-right font-mono text-xs pt-1">{msg.receiptData.referenceNumber}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap pb-3 pr-2">{msg.text}</div>
                    )}

                    {/* Timestamp and Checkmarks */}
                    <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-[#667781] bg-transparent">
                      <span>{msg.timestamp}</span>
                      {msg.sender === "user" && <CheckCheck className="w-[15px] h-[15px] text-[#53bdeb] ml-0.5" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="relative bg-white text-[#111b21] rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center">
                  <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white">
                    <path fill="currentColor" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                  </svg>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="min-h-[62px] bg-white/30 backdrop-blur-md flex items-center px-4 py-2.5 gap-2 shrink-0 rounded-b-lg">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            
            <button
              className="p-2 text-[#54656f] hover:bg-black/5 rounded-full transition-colors flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isTyping}
            >
              {isUploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Paperclip className="w-[22px] h-[22px] -rotate-45" />}
            </button>
            
            <div className="flex-1 bg-white/40 backdrop-blur-sm rounded-lg flex items-center overflow-hidden px-3 shadow-sm min-h-[42px]">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message"
                className="w-full bg-transparent border-none focus:outline-none text-[15px] py-2 text-[#111b21]"
                disabled={isUploading || isTyping}
              />
            </div>
            
            {inputValue.trim() ? (
              <button
                onClick={handleSendMessage}
                className="p-2.5 bg-[#00a884] text-white rounded-full flex-shrink-0 hover:bg-[#008f6f] shadow-sm ml-1 transition-all"
                disabled={isUploading || isTyping}
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button
                className="p-2 text-[#54656f] hover:bg-black/5 rounded-full transition-colors flex-shrink-0 ml-1"
                disabled
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z"></path>
                </svg>
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

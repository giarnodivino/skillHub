import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

type ChatUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: string;
  profile_picture?: string | null;
};

type Message = {
  id: number;
  conversation: number;
  sender: ChatUser;
  body: string;
  created_at: string;
  is_mine: boolean;
};

type Conversation = {
  id: number;
  customer: ChatUser;
  contractor: ChatUser;
  other_participant: ChatUser;
  latest_message: Message | null;
  created_at: string;
  updated_at: string;
};

function getAuthHeaders() {
  const token = localStorage.getItem("skillhub_access_token");
  return token ? { Authorization: `Bearer ${token}` } : null;
}

function getProfilePictureUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `http://127.0.0.1:8000${path}`;
  }

  return `http://127.0.0.1:8000/media/${path}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const activeConversationId = conversationId ? Number(conversationId) : null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  useEffect(() => {
    const loadConversations = async () => {
      const headers = getAuthHeaders();

      if (!headers) {
        navigate("/login");
        return;
      }

      try {
        setIsLoadingConversations(true);
        setErrorMessage("");
        const response = await api.get<Conversation[]>("chat/conversations/", { headers });
        setConversations(response.data);
      } catch {
        setErrorMessage("We could not load your conversations right now.");
      } finally {
        setIsLoadingConversations(false);
      }
    };

    void loadConversations();
  }, [navigate]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async (showLoading = true) => {
      const headers = getAuthHeaders();

      if (!headers) {
        navigate("/login");
        return;
      }

      try {
        if (showLoading) {
          setIsLoadingMessages(true);
        }
        setErrorMessage("");
        const response = await api.get<Message[]>(`chat/conversations/${activeConversationId}/messages/`, { headers });
        setMessages(response.data);
      } catch {
        setErrorMessage("We could not load this conversation.");
      } finally {
        if (showLoading) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages(false);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeConversationId, navigate]);

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeConversationId || !draft.trim()) {
      return;
    }

    const headers = getAuthHeaders();

    if (!headers) {
      navigate("/login");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      const response = await api.post<Message>(
        `chat/conversations/${activeConversationId}/messages/`,
        { body: draft },
        { headers },
      );
      setMessages((prev) => [...prev, response.data]);
      setDraft("");
      const conversationsResponse = await api.get<Conversation[]>("chat/conversations/", { headers });
      setConversations(conversationsResponse.data);
    } catch {
      setErrorMessage("We could not send your message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid min-h-170 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
      <aside
        className={`border-b border-slate-200 bg-slate-50 lg:block lg:border-b-0 lg:border-r ${
          activeConversation ? "hidden" : "block"
        }`}
      >
        <div className="border-b border-slate-200 p-5">
          <h1 className="text-xl font-semibold text-slate-950">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Chat with customers and contractors.</p>
        </div>

        <div className="max-h-155 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="p-5 text-sm text-slate-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-5 text-sm leading-6 text-slate-500">
              No chats yet. Start one from the professionals page.
            </div>
          ) : (
            conversations.map((conversation) => {
              const participant = conversation.other_participant;
              const imageUrl = getProfilePictureUrl(participant.profile_picture);
              const isActive = conversation.id === activeConversationId;

              return (
                <Link
                  key={conversation.id}
                  to={`/messages/${conversation.id}`}
                  className={`flex gap-3 border-b border-slate-200 p-4 transition ${
                    isActive ? "bg-white" : "hover:bg-white"
                  }`}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={participant.name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                      {getInitials(participant.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-950">{participant.name}</p>
                      <span className="shrink-0 text-xs text-slate-400">{formatTime(conversation.updated_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {conversation.latest_message?.body ?? "Conversation started"}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      <section className={`min-h-170 flex-col lg:flex ${activeConversation ? "flex" : "hidden"}`}>
        {activeConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <Link
                to="/messages"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 lg:hidden"
              >
                Back
              </Link>
              {getProfilePictureUrl(activeConversation.other_participant.profile_picture) ? (
                <img
                  src={getProfilePictureUrl(activeConversation.other_participant.profile_picture) ?? ""}
                  alt={activeConversation.other_participant.name}
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                  {getInitials(activeConversation.other_participant.name)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-950">
                  {activeConversation.other_participant.name}
                </h2>
                <p className="truncate text-sm text-slate-500">{activeConversation.other_participant.email}</p>
              </div>
            </div>

            {errorMessage ? (
              <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">{errorMessage}</div>
            ) : null}

            <div className="flex-1 space-y-4 overflow-y-auto bg-white p-5">
              {isLoadingMessages ? (
                <p className="text-sm text-slate-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500">Send the first message to get the conversation started.</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.is_mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.is_mine ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="wrap-break-word">{message.body}</p>
                      <p className={`mt-1 text-xs ${message.is_mine ? "text-slate-300" : "text-slate-500"}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="border-t border-slate-200 p-4" onSubmit={handleSendMessage}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  placeholder="Write a message"
                  className="min-h-16 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isSending || !draft.trim()}
                  className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Select a conversation</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Choose a chat from the list, or start a new conversation from the professionals page.
              </p>
              <Link
                to="/professionals"
                className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Browse professionals
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

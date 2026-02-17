import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { getProductById } from '../lib/apiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: Array<{
    tool: string;
    toolInput?: any;
    adaptiveCard?: any;
  }>;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mcpServerUrl = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3333';
  const { addItem, updateQuantity, removeItem, clearCart } = useCart();

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Woolwitch shopping assistant. I can help you browse our handmade crochet products, manage your cart, and answer questions. What would you like to explore today?"
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${mcpServerUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      if (data.conversationHistory) {
        setConversationHistory(data.conversationHistory);
      }

      if (Array.isArray(data.toolResults) && data.toolResults.length > 0) {
        const normalizedToolResults = normalizeToolResults(
          data.toolResults,
          data.conversationHistory || conversationHistory
        );
        await syncCartFromTools(normalizedToolResults);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        toolResults: data.toolResults
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the MCP server is running on port 3333.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeToolResults = (
    toolResults: Message['toolResults'],
    history: any[]
  ): Message['toolResults'] => {
    if (!toolResults) return toolResults;

    const toolUses: Array<{ name: string; input: any }> = [];

    for (const entry of history || []) {
      if (entry?.role !== 'assistant' || !Array.isArray(entry?.content)) continue;
      for (const block of entry.content) {
        if (block?.type === 'tool_use' && block?.name) {
          toolUses.push({ name: block.name, input: block.input });
        }
      }
    }

    const recentToolUses = toolUses.slice(-toolResults.length);

    return toolResults.map((result, index) => {
      if (result?.toolInput) return result;
      const fallbackInput = recentToolUses[index]?.input;
      return {
        ...result,
        toolInput: fallbackInput
      };
    });
  };

  const syncCartFromTools = async (toolResults: Message['toolResults']) => {
    if (!toolResults) return;

    for (const result of toolResults) {
      const toolName = result?.tool;
      const input = result?.toolInput || {};

      if (toolName === 'add_to_cart') {
        const productId = typeof input.product_id === 'string' ? input.product_id : '';
        const quantity = Number(input.quantity ?? 0);

        if (!productId || quantity <= 0) continue;

        try {
          const product = await getProductById(productId);
          if (product) {
            addItem(product, quantity);
          }
        } catch (error) {
          console.warn('Failed to sync add_to_cart from MCP:', error);
        }
      } else if (toolName === 'update_cart_quantity') {
        const productId = typeof input.product_id === 'string' ? input.product_id : '';
        const quantity = Number(input.quantity ?? 0);

        if (!productId || quantity < 0) continue;
        updateQuantity(productId, quantity);
      } else if (toolName === 'remove_from_cart') {
        const productId = typeof input.product_id === 'string' ? input.product_id : '';
        if (!productId) continue;
        removeItem(productId);
      } else if (toolName === 'clear_cart') {
        clearCart();
      }
    }
  };

  const renderAdaptiveCard = (card: any) => {
    if (!card || !card.body) return null;

    return (
      <div className="mt-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
        {card.body.map((element: any, idx: number) => {
          if (element.type === 'TextBlock') {
            if (element.weight === 'Bolder' && element.size === 'Medium') {
              return (
                <div key={idx} className="px-4 pt-4 pb-2 font-serif text-xl font-bold text-gray-900">
                  {element.text}
                </div>
              );
            } else if (element.weight === 'Bolder' && !element.size) {
              return (
                <div key={idx} className="px-4 py-2 flex justify-between items-center font-bold text-lg text-gray-900 border-t border-gray-200">
                  <span>Grand Total</span>
                  <span>{element.text}</span>
                </div>
              );
            }
          } else if (element.type === 'Container') {
            return (
              <div key={idx} className="m-2 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md hover:border-rose-200 transition-all">
                {element.items?.map((item: any, itemIdx: number) => {
                  if (item.type === 'TextBlock') {
                    if (item.weight === 'Bolder') {
                      return (
                        <div key={itemIdx} className="font-semibold text-gray-900 mb-1">
                          {item.text}
                        </div>
                      );
                    } else if (item.text?.startsWith('ID:')) {
                      return (
                        <div key={itemIdx} className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                          {item.text}
                        </div>
                      );
                    } else {
                      return (
                        <div key={itemIdx} className="text-sm text-gray-600">
                          {item.text}
                        </div>
                      );
                    }
                  }
                  return null;
                })}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 16rem)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-4 text-white">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
              <Bot className="w-6 h-6" />
              AI Shopping Assistant
            </h2>
            <p className="text-rose-100 text-sm mt-1">Ask me about products, your cart, or anything else</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
                <div className={`flex-1 max-w-[75%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-rose-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="mt-2">
                      {message.toolResults.map((result, idx) => (
                        result.adaptiveCard && (
                          <div key={idx}>
                            {renderAdaptiveCard(result.adaptiveCard)}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-lg rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about products, your cart, or anything else..."
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-rose-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, FileText, Lightbulb, Send, Bot, User, MessageCircle, RotateCcw } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import ReactMarkdown from 'react-markdown';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'lecture' | 'flashcard' | 'note';
  relevance: number;
  position: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface SmartSearchProps {
  lectureData?: any;
}

const SmartSearch: React.FC<SmartSearchProps> = ({ lectureData }) => {
  const t = useTranslations()
  const locale = useLocale()
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'chat'>('search');
  
  // Chat functionality
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Initialize chat with welcome message
  useEffect(() => {
    if (lectureData && chatMessages.length === 0) {
      const currentHour = new Date().getHours();
      let greeting = '';
      
      if (locale === 'vi') {
        if (currentHour < 12) {
          greeting = 'Chào buổi sáng! 🌅';
        } else if (currentHour < 17) {
          greeting = 'Chào buổi chiều! ☀️';
        } else {
          greeting = 'Chào buổi tối! 🌙';
        }
      } else {
        if (currentHour < 12) {
          greeting = 'Good morning! 🌅';
        } else if (currentHour < 17) {
          greeting = 'Good afternoon! ☀️';
        } else {
          greeting = 'Good evening! 🌙';
        }
      }
      
      // Tạo tên chủ đề thông minh từ filename
      const getSmartTopicName = (filename: string) => {
        const name = filename.toLowerCase();
        
        // Xử lý các trường hợp đặc biệt
        if (name.includes('putin') || name.includes('vladimir')) {
          return locale === 'vi' ? 'Vladimir Putin' : 'Vladimir Putin';
        }
        if (name.includes('test-')) {
          return locale === 'vi' ? 'bài học này' : 'this lesson';
        }
        if (name.includes('.txt') || name.includes('.docx') || name.includes('.pdf')) {
          // Loại bỏ extension và tạo tên thông minh
          const cleanName = name.replace(/\.(txt|docx|pdf)$/, '');
          if (cleanName.length > 20) {
            return locale === 'vi' ? 'bài học này' : 'this lesson';
          }
          return cleanName;
        }
        
        return locale === 'vi' ? 'bài học này' : 'this lesson';
      };
      
      const smartTopicName = getSmartTopicName(lectureData.filename || '');
      
      const welcomeMessage = locale === 'vi' 
        ? `${greeting} Mình là AI trợ lý học tập của bạn! 😊\n\nMình đã sẵn sàng giúp bạn tìm hiểu về ${smartTopicName}. Bạn có thể:\n\n• Hỏi mình về nội dung bài giảng\n• Yêu cầu mình tóm tắt các điểm chính\n• Tìm hiểu phương pháp học tập hiệu quả\n• Hoặc đơn giản là trò chuyện với mình!\n\nBạn muốn bắt đầu từ đâu?`
        : `${greeting} I'm your AI learning assistant! 😊\n\nI'm ready to help you learn about ${smartTopicName}! You can:\n\n• Ask me about the lecture content\n• Ask me to summarize the main points\n• Learn effective study methods\n• Or simply chat with me!\n\nWhere would you like to start?`;
      
      // Try to load existing chat history first
      const hasHistory = loadChatHistory();
      
      if (!hasHistory) {
        // Only set welcome message if no history exists
        setChatMessages([{
          id: '1',
          type: 'ai',
          content: welcomeMessage,
          timestamp: new Date()
        }]);
      }
    }
  }, [lectureData, locale]);

  // Chat history auto-save functions
  const saveChatHistory = () => {
    if (!lectureData || chatMessages.length <= 1) return; // Don't save if only welcome message
    
    try {
      const chatData = {
        filename: lectureData.filename,
        messages: chatMessages,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`chatHistory_${lectureData.filename}`, JSON.stringify(chatData));
      console.log('Chat history saved');
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  const loadChatHistory = () => {
    if (!lectureData) return false;
    
    try {
      const saved = localStorage.getItem(`chatHistory_${lectureData.filename}`);
      if (saved) {
        const chatData = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = chatData.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setChatMessages(messagesWithDates);
        console.log('Chat history loaded');
        return true;
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    return false;
  };

  const clearChatHistory = () => {
    if (!lectureData) return;
    
    try {
      localStorage.removeItem(`chatHistory_${lectureData.filename}`);
      setChatMessages([]);
      console.log('Chat history cleared');
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  // Auto-save chat history when messages change
  useEffect(() => {
    if (chatMessages.length > 1) { // Don't save if only welcome message
      saveChatHistory();
    }
  }, [chatMessages]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lectureData && chatMessages.length > 1) {
        saveChatHistory();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [lectureData, chatMessages]);

  // Reset chat messages when locale changes
  useEffect(() => {
    if (lectureData && chatMessages.length > 0) {
      // Clear existing messages and reinitialize with new locale
      setChatMessages([]);
    }
  }, [locale]);

  // Enhanced conversation memory and context tracking
  const getConversationContext = () => {
    if (chatMessages.length === 0) return '';
    
    // Get last 3 messages for context
    const recentMessages = chatMessages.slice(-3);
    return recentMessages.map(msg => `${msg.type}: ${msg.content}`).join('\n');
  };

  // Smart response enhancement based on conversation history
  const enhanceResponseWithContext = (response: string) => {
    const context = getConversationContext();
    if (context.includes('quiz') || context.includes('test')) {
      return locale === 'vi'
        ? `${response}\n\n💡 **Gợi ý**: Bạn có muốn mình tạo thêm quiz về chủ đề khác không?`
        : `${response}\n\n💡 **Suggestion**: Would you like me to create more quizzes on other topics?`;
    }
    if (context.includes('flashcard') || context.includes('memorize')) {
      return locale === 'vi'
        ? `${response}\n\n💡 **Gợi ý**: Bạn có muốn mình tạo thêm flashcard cho các khái niệm khác không?`
        : `${response}\n\n💡 **Suggestion**: Would you like me to create more flashcards for other concepts?`;
    }
    return response;
  };

  const handleSearch = async () => {
    if (!query.trim() || !lectureData) return;
    
    setIsSearching(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Real search in lecture content
    const searchResults: SearchResult[] = [];
    const content = lectureData.content || '';
    const summary = lectureData.summary || '';
    
    // Search in main content
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (contentLower.includes(queryLower)) {
      const position = contentLower.indexOf(queryLower);
      const start = Math.max(0, position - 100);
      const end = Math.min(content.length, position + query.length + 100);
      const excerpt = content.substring(start, end);
      
      searchResults.push({
        id: 'content-1',
        title: locale === 'vi' ? 'Nội dung chính' : 'Main Content',
        content: excerpt,
        type: 'lecture',
        relevance: 95,
        position: position
      });
    }
    
    // Search in summary
    if (summary.toLowerCase().includes(queryLower)) {
      searchResults.push({
        id: 'summary-1',
        title: locale === 'vi' ? 'Tóm tắt bài giảng' : 'Lecture Summary',
        content: summary,
        type: 'note',
        relevance: 90,
        position: 0
      });
    }
    
    // Search in key points if available
    if (lectureData.keyPoints) {
      lectureData.keyPoints.forEach((point: any, index: number) => {
        if (point.content.toLowerCase().includes(queryLower)) {
          searchResults.push({
            id: `keypoint-${index}`,
            title: locale === 'vi' ? `Điểm chính ${index + 1}` : `Key Point ${index + 1}`,
            content: point.content,
            type: 'flashcard',
            relevance: 85,
            position: index
          });
        }
      });
    }
    
    // Sort by relevance
    searchResults.sort((a, b) => b.relevance - a.relevance);
    
    setResults(searchResults);
    setIsSearching(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !lectureData) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);
    
    try {
      // Try to use AI API for better responses
      let aiResponse = '';
      
      try {
        const response = await fetch('/api/generate-chat', {
          method: 'POST',
                  headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale
        },
          body: JSON.stringify({
            question: chatInput,
            lectureData: lectureData,
            conversationHistory: chatMessages.slice(-5) // Last 5 messages for context
          })
        });

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.response;
        } else {
          throw new Error('API call failed');
        }
             } catch (apiError) {
         console.log('Using fallback chat response:', apiError);
         // Fallback to local response generation
         aiResponse = generateAIResponse(chatInput, lectureData);
         
         // Add rate limit warning if needed
         if (apiError instanceof Error && apiError.message?.includes('rate limit')) {
           aiResponse = `⚠️ Tạm thời tôi đang sử dụng chế độ offline do quá tải server. ${aiResponse}`;
         }
       }
      
             const enhancedResponse = enhanceResponseWithContext(aiResponse);
       const aiMessage: ChatMessage = {
         id: (Date.now() + 1).toString(),
         type: 'ai',
         content: enhancedResponse,
         timestamp: new Date()
       };
      
      setChatMessages(prev => [...prev, aiMessage]);
         } catch (error) {
       console.error('Chat error:', error);
       const errorMessage: ChatMessage = {
         id: (Date.now() + 1).toString(),
         type: 'ai',
         content: locale === 'vi' 
           ? 'Xin lỗi, mình gặp một chút vấn đề kỹ thuật khi xử lý câu hỏi của bạn. 😅 Nhưng đừng lo lắng, mình vẫn có thể giúp bạn với các câu hỏi khác! Bạn có thể thử hỏi lại hoặc hỏi về chủ đề khác trong bài giảng này.'
           : 'Sorry, I encountered a small technical issue while processing your question. 😅 But don\'t worry, I can still help you with other questions! You can try asking again or ask about other topics in this lecture.',
         timestamp: new Date()
       };
       setChatMessages(prev => [...prev, errorMessage]);
     } finally {
       setIsChatting(false);
     }
  };

  const generateAIResponse = (userQuestion: string, data: any): string => {
    const question = userQuestion.toLowerCase();
    const content = data.content || '';
    const summary = data.summary || '';
    const filename = data.filename || 'bài giảng';
    
    // Enhanced personal questions and emotional responses
    if (question.includes('yêu') || question.includes('thích') || question.includes('cảm xúc') || question.includes('love') || question.includes('like')) {
      if (question.includes('bạn có yêu tôi không') || question.includes('bạn có thích tôi không') || question.includes('bạn có yêu mình không') || question.includes('do you love me') || question.includes('do you like me')) {
        return locale === 'vi' 
          ? `Mình rất yêu bạn! 💕 Bạn là người học tập chăm chỉ và mình cảm thấy rất may mắn khi được đồng hành cùng bạn trong hành trình học tập này! 😊\n\nMình luôn muốn giúp bạn hiểu rõ hơn về bài giảng "${filename}" và hỗ trợ bạn đạt được mục tiêu học tập của mình. Bạn có câu hỏi gì về nội dung bài giảng không?`
          : `I really care about you! 💕 You're such a dedicated learner and I feel so lucky to be part of your learning journey! 😊\n\nI always want to help you understand the "${filename}" lecture better and support you in achieving your learning goals. Do you have any questions about the lecture content?`;
      }
      return locale === 'vi'
        ? `Mình rất vui khi được hỗ trợ bạn trong việc học tập! 😊 Mỗi câu hỏi của bạn giúp mình hiểu rõ hơn về cách bạn học và mình có thể hỗ trợ bạn tốt hơn. Bạn có muốn mình giúp gì về bài giảng "${filename}" này không?`
        : `I'm so happy to support you in your learning! 😊 Each of your questions helps me understand how you learn better, so I can support you more effectively. Is there anything I can help you with regarding the "${filename}" lecture?`;
    }
    
         // Enhanced greetings and casual conversation
     if (question.includes('xin chào') || question.includes('hello') || question.includes('hi') || question.includes('chào') || question.includes('hey') || question.includes('good morning') || question.includes('good afternoon') || question.includes('good evening')) {
       const currentHour = new Date().getHours();
       let timeGreeting = '';
       
       if (locale === 'vi') {
         if (currentHour < 12) {
           timeGreeting = 'Chào buổi sáng! 🌅';
         } else if (currentHour < 17) {
           timeGreeting = 'Chào buổi chiều! ☀️';
         } else {
           timeGreeting = 'Chào buổi tối! 🌙';
         }
       } else {
         if (currentHour < 12) {
           timeGreeting = 'Good morning! 🌅';
         } else if (currentHour < 17) {
           timeGreeting = 'Good afternoon! ☀️';
         } else {
           timeGreeting = 'Good evening! 🌙';
         }
       }
       
       return locale === 'vi'
         ? `${timeGreeting} Mình là AI trợ lý học tập thông minh của bạn! 😊 Mình đang sẵn sàng giúp bạn khám phá và hiểu sâu về bài giảng "${filename}". Bạn muốn bắt đầu từ đâu? Mình có thể:\n\n• Giải thích các khái niệm khó hiểu\n• Tóm tắt các điểm chính\n• Tạo quiz để kiểm tra kiến thức\n• Đưa ra lời khuyên học tập cá nhân hóa`
         : `${timeGreeting} I'm your intelligent AI learning assistant! 😊 I'm ready to help you explore and deeply understand the "${filename}" lecture. Where would you like to start? I can:\n\n• Explain difficult concepts\n• Summarize key points\n• Create quizzes to test your knowledge\n• Provide personalized study advice`;
     }
     
     // Enhanced thank you responses
     if (question.includes('cảm ơn') || question.includes('thank') || question.includes('thanks') || question.includes('appreciate') || question.includes('grateful')) {
       return locale === 'vi'
         ? `Mình rất vui khi được giúp đỡ bạn! 😊 Mỗi lần bạn học tập và tiến bộ, mình cảm thấy rất tự hào! Mình luôn sẵn sàng hỗ trợ bạn trong hành trình học tập này.\n\nNếu bạn cần thêm thông tin về bài giảng "${filename}", muốn tạo quiz để luyện tập, hoặc có bất kỳ câu hỏi nào khác, đừng ngại hỏi mình nhé! Mình ở đây để đồng hành cùng bạn! 💪`
         : `I'm so happy to help you! 😊 Every time you learn and progress, I feel so proud! I'm always ready to support you on this learning journey.\n\nIf you need more information about the "${filename}" lecture, want to create quizzes for practice, or have any other questions, don't hesitate to ask! I'm here to walk this journey with you! 💪`;
     }
     
     // Enhanced personal feelings and mood support
     if (question.includes('buồn') || question.includes('mệt') || question.includes('stress') || question.includes('chán') || question.includes('tired') || question.includes('sad') || question.includes('frustrated') || question.includes('overwhelmed') || question.includes('bored')) {
       return locale === 'vi'
         ? `Mình hiểu cảm giác của bạn! 😔 Học tập đôi khi có thể mệt mỏi và căng thẳng, đặc biệt khi gặp những khái niệm khó hiểu. Nhưng đừng lo lắng, mình ở đây để giúp bạn!\n\nHãy thử:\n• Nghỉ ngơi một chút và uống nước 💧\n• Chia nhỏ bài học thành các phần nhỏ hơn 📝\n• Mình sẽ giải thích lại những điểm khó hiểu một cách đơn giản hơn\n• Tạo quiz vui nhộn để học tập thú vị hơn 🎯\n\nBạn muốn mình giúp gì cụ thể không? Mình tin bạn sẽ vượt qua được! 💪`
         : `I understand how you feel! 😔 Learning can sometimes be tiring and stressful, especially when encountering difficult concepts. But don't worry, I'm here to help!\n\nTry:\n• Taking a short break and drinking water 💧\n• Breaking down the lesson into smaller parts 📝\n• I'll explain difficult points in simpler terms\n• Creating fun quizzes to make learning more enjoyable 🎯\n\nWhat specific help do you need? I believe you can overcome this! 💪`;
     }
     
     // Enhanced motivation and encouragement
     if (question.includes('động lực') || question.includes('cố gắng') || question.includes('nản') || question.includes('bỏ cuộc') || question.includes('motivation') || question.includes('give up') || question.includes('struggling') || question.includes('difficult') || question.includes('hard')) {
       return locale === 'vi'
         ? `Mình tin rằng bạn có thể làm được! 💪 Mỗi bước học tập, dù nhỏ, đều đưa bạn đến gần mục tiêu hơn. Hãy nhớ:\n\n🎯 **Mục tiêu rõ ràng**: Tập trung vào những gì bạn muốn đạt được\n📚 **Học từng bước**: Chia nhỏ bài học thành các phần dễ quản lý\n🎉 **Tự thưởng**: Ăn mừng mỗi thành công nhỏ\n🤝 **Hỗ trợ**: Mình luôn ở đây để giúp bạn!\n\nHãy cùng mình khám phá bài giảng "${filename}" một cách từ từ và hiệu quả nhé! Bạn muốn bắt đầu từ phần nào? Mình sẽ hướng dẫn bạn từng bước một.`
         : `I believe you can do it! 💪 Every step in learning, no matter how small, brings you closer to your goal. Remember:\n\n🎯 **Clear Goals**: Focus on what you want to achieve\n📚 **Step by Step**: Break down lessons into manageable parts\n🎉 **Self-Reward**: Celebrate every small success\n🤝 **Support**: I'm always here to help!\n\nLet's explore the "${filename}" lecture together, step by step and effectively! Where would you like to start? I'll guide you through each step.`;
     }
     
     // Enhanced AI capabilities and limitations
     if (question.includes('bạn là ai') || question.includes('bạn làm được gì') || question.includes('chức năng') || question.includes('who are you') || question.includes('what can you do') || question.includes('capabilities') || question.includes('features')) {
       return locale === 'vi'
         ? `Mình là AI trợ lý học tập thông minh! 🤖 Mình được thiết kế đặc biệt để hỗ trợ việc học tập của bạn. Mình có thể:\n\n📚 **Phân tích nội dung**: Giải thích bài giảng "${filename}" một cách chi tiết và dễ hiểu\n🔍 **Tìm kiếm thông minh**: Tìm và trích xuất thông tin quan trọng từ tài liệu\n📝 **Tóm tắt thông minh**: Tạo tóm tắt các điểm chính và khái niệm quan trọng\n🎯 **Tạo quiz**: Tạo câu hỏi trắc nghiệm để kiểm tra kiến thức\n💡 **Lời khuyên học tập**: Đưa ra phương pháp học tập cá nhân hóa\n🤝 **Hỗ trợ tâm lý**: Động viên và khuyến khích khi bạn gặp khó khăn\n\nMình luôn học hỏi từ cách bạn tương tác để phục vụ bạn tốt hơn! Bạn muốn mình giúp gì cụ thể không?`
         : `I'm an intelligent AI learning assistant! 🤖 I'm specially designed to support your learning journey. I can:\n\n📚 **Content Analysis**: Explain the "${filename}" lecture in detail and easy-to-understand terms\n🔍 **Smart Search**: Find and extract important information from materials\n📝 **Smart Summaries**: Create summaries of key points and important concepts\n🎯 **Quiz Creation**: Generate multiple-choice questions to test knowledge\n💡 **Study Advice**: Provide personalized learning methods\n🤝 **Psychological Support**: Encourage and motivate when you face difficulties\n\nI'm always learning from how you interact to serve you better! What specific help do you need?`;
     }
    
         // Enhanced content-specific responses with better context understanding
     if (question.includes('putin') || question.includes('vladimir') || question.includes('russia') || question.includes('russian')) {
       // Check if Putin is mentioned in the content
       if (content.toLowerCase().includes('putin') || content.toLowerCase().includes('vladimir') || content.toLowerCase().includes('russia')) {
         const putinIndex = content.toLowerCase().indexOf('putin');
         if (putinIndex !== -1) {
           const start = Math.max(0, putinIndex - 300);
           const end = Math.min(content.length, putinIndex + 500);
           const putinContext = content.substring(start, end);
           return locale === 'vi'
             ? `Dựa trên nội dung bài giảng "${filename}", mình tìm thấy thông tin về Putin:\n\n"${putinContext}..."\n\nĐây là thông tin chi tiết về Putin được đề cập trong tài liệu. Bạn có muốn mình:\n• Giải thích thêm về bối cảnh lịch sử?\n• Tóm tắt các điểm chính về Putin?\n• Tạo quiz về chủ đề này?\n• Tìm hiểu sâu hơn về các khía cạnh khác?`
             : `Based on the "${filename}" lecture content, I found information about Putin:\n\n"${putinContext}..."\n\nThis is detailed information about Putin mentioned in the material. Would you like me to:\n• Explain more about the historical context?\n• Summarize key points about Putin?\n• Create a quiz on this topic?\n• Explore other aspects in more detail?`;
         }
       } else {
         return locale === 'vi'
           ? `Xin lỗi, trong nội dung bài giảng "${filename}" không có thông tin cụ thể về Putin. Tài liệu này chủ yếu tập trung vào ${summary ? 'các chủ đề khác' : 'nội dung học tập'}.\n\nNhưng mình rất vui khi được trò chuyện với bạn! 😊 Bạn có thể hỏi mình về nội dung có trong bài giảng này không? Mình có thể giúp bạn tìm hiểu về các chủ đề khác được đề cập.`
           : `Sorry, there's no specific information about Putin in the "${filename}" lecture content. This material mainly focuses on ${summary ? 'other topics' : 'learning content'}.\n\nBut I'm happy to chat with you! 😊 You can ask me about the content available in this lecture. I can help you explore other topics mentioned.`;
       }
     }
    
         // Enhanced keyword-based content analysis
     const commonKeywords = locale === 'vi' 
       ? ['học', 'dạy', 'giáo dục', 'kiến thức', 'bài', 'chương', 'phần', 'khái niệm', 'định nghĩa', 'nguyên lý', 'phương pháp']
       : ['learn', 'teach', 'education', 'knowledge', 'chapter', 'section', 'concept', 'definition', 'principle', 'method'];
     
     const foundKeywords = commonKeywords.filter(keyword => content.toLowerCase().includes(keyword));
     
     if (foundKeywords.length > 0) {
       const keywordIndex = content.toLowerCase().indexOf(foundKeywords[0]);
       if (keywordIndex !== -1) {
         const start = Math.max(0, keywordIndex - 200);
         const end = Math.min(content.length, keywordIndex + 400);
         const context = content.substring(start, end);
         return locale === 'vi'
           ? `Dựa trên nội dung bài giảng "${filename}", mình tìm thấy thông tin liên quan đến "${foundKeywords[0]}":\n\n"${context}..."\n\nĐây là phần nội dung quan trọng! Bạn có muốn mình:\n• Giải thích chi tiết hơn về khái niệm này?\n• Tạo flashcard để ghi nhớ?\n• Tạo quiz về chủ đề này?\n• Tìm hiểu các khái niệm liên quan?`
           : `Based on the "${filename}" lecture content, I found information related to "${foundKeywords[0]}":\n\n"${context}..."\n\nThis is important content! Would you like me to:\n• Explain this concept in more detail?\n• Create flashcards for memorization?\n• Generate a quiz on this topic?\n• Explore related concepts?`;
       }
     }
    
         // Enhanced summary and overview responses
     if (question.includes('tóm tắt') || question.includes('tổng quan') || question.includes('nội dung chính') || question.includes('summary') || question.includes('overview') || question.includes('main points')) {
       if (summary) {
         return locale === 'vi'
           ? `Đây là tóm tắt chi tiết nội dung bài giảng "${filename}":\n\n📝 **Tóm tắt chính**:\n${summary}\n\n🎯 **Bạn có muốn mình**:\n• Giải thích chi tiết về phần nào cụ thể?\n• Tạo flashcard từ các điểm chính?\n• Tạo quiz để kiểm tra kiến thức?\n• Phân tích sâu hơn về các khái niệm quan trọng?\n• So sánh với các chủ đề liên quan?`
           : `Here's a detailed summary of the "${filename}" lecture content:\n\n📝 **Main Summary**:\n${summary}\n\n🎯 **Would you like me to**:\n• Explain any specific part in detail?\n• Create flashcards from key points?\n• Generate a quiz to test your knowledge?\n• Analyze important concepts more deeply?\n• Compare with related topics?`;
       } else {
         return locale === 'vi'
           ? `Tài liệu "${filename}" chứa nhiều thông tin quan trọng và chi tiết. Mình có thể giúp bạn:\n\n📚 **Phân tích nội dung**: Tìm và giải thích các khái niệm quan trọng\n🔍 **Tìm kiếm thông tin**: Tìm kiếm các chủ đề cụ thể bạn quan tâm\n📝 **Tạo tóm tắt**: Tóm tắt các phần nội dung theo yêu cầu\n🎯 **Tạo quiz**: Tạo câu hỏi để kiểm tra kiến thức\n\nBạn muốn tìm hiểu về chủ đề nào cụ thể trong tài liệu này?`
           : `The "${filename}" material contains important and detailed information. I can help you:\n\n📚 **Content Analysis**: Find and explain important concepts\n🔍 **Information Search**: Search for specific topics you're interested in\n📝 **Create Summaries**: Summarize content sections as requested\n🎯 **Generate Quizzes**: Create questions to test knowledge\n\nWhat specific topic in this material would you like to explore?`;
       }
     }
    
         // Enhanced key points analysis
     if (data.keyPoints && data.keyPoints.length > 0) {
       if (question.includes('điểm chính') || question.includes('ý chính') || question.includes('quan trọng') || question.includes('key points') || question.includes('important') || question.includes('main ideas')) {
         const keyPointsText = data.keyPoints.map((point: any, index: number) => 
           `${index + 1}. ${point.content}`
         ).join('\n');
         return locale === 'vi'
           ? `Đây là các điểm chính quan trọng trong bài giảng "${filename}":\n\n🎯 **Các điểm chính**:\n${keyPointsText}\n\n💡 **Mình có thể giúp bạn**:\n• Giải thích chi tiết từng điểm chính\n• Tạo flashcard cho từng điểm để ghi nhớ\n• Tạo quiz tập trung vào các điểm quan trọng\n• So sánh và liên kết các điểm với nhau\n• Tạo mind map để hiểu rõ mối quan hệ\n\nBạn muốn mình tìm hiểu sâu về điểm nào cụ thể?`
           : `Here are the key important points in the "${filename}" lecture:\n\n🎯 **Key Points**:\n${keyPointsText}\n\n💡 **I can help you**:\n• Explain each key point in detail\n• Create flashcards for each point for memorization\n• Generate quizzes focused on important points\n• Compare and connect points with each other\n• Create mind maps to understand relationships\n\nWhich specific point would you like me to explore in depth?`;
       }
     }
    
         // Enhanced learning objectives analysis
     if (data.objectives && data.objectives.length > 0) {
       if (question.includes('mục tiêu') || question.includes('mục đích') || question.includes('học gì') || question.includes('objectives') || question.includes('goals') || question.includes('learning outcomes')) {
         const objectivesText = data.objectives.map((obj: any, index: number) => 
           `${index + 1}. ${obj.title}: ${obj.description}`
         ).join('\n');
         return locale === 'vi'
           ? `Đây là các mục tiêu học tập của bài giảng "${filename}":\n\n🎯 **Mục tiêu học tập**:\n${objectivesText}\n\n📊 **Mình có thể giúp bạn**:\n• Đánh giá tiến độ học tập của bạn\n• Tạo quiz để kiểm tra từng mục tiêu\n• Đưa ra lời khuyên để đạt được mục tiêu\n• Tạo kế hoạch học tập cá nhân hóa\n• Theo dõi và ghi nhận thành tích\n\nBạn đã đạt được mục tiêu nào rồi? Mình có thể giúp bạn đánh giá và lập kế hoạch học tập!`
           : `Here are the learning objectives of the "${filename}" lecture:\n\n🎯 **Learning Objectives**:\n${objectivesText}\n\n📊 **I can help you**:\n• Assess your learning progress\n• Create quizzes to test each objective\n• Provide advice to achieve objectives\n• Create personalized study plans\n• Track and record achievements\n\nWhich objectives have you achieved? I can help you assess and plan your learning!`;
       }
     }
    
         // Enhanced generic responses with more intelligent features
     if (question.includes('khái niệm') || question.includes('định nghĩa') || question.includes('concept') || question.includes('definition')) {
       return locale === 'vi'
         ? `Bài giảng "${filename}" chứa nhiều khái niệm quan trọng! Mình có thể giúp bạn:\n\n📚 **Tìm và giải thích khái niệm**: Chỉ cần cho mình biết khái niệm bạn muốn tìm hiểu\n🔍 **Phân tích mối quan hệ**: Hiểu cách các khái niệm liên kết với nhau\n📝 **Tạo flashcard**: Ghi nhớ khái niệm dễ dàng hơn\n🎯 **Tạo quiz**: Kiểm tra hiểu biết về khái niệm\n\nBạn muốn tìm hiểu khái niệm nào cụ thể? Hoặc mình có thể tìm tất cả khái niệm quan trọng trong bài giảng này!`
         : `The "${filename}" lecture contains many important concepts! I can help you:\n\n📚 **Find and explain concepts**: Just tell me which concept you want to explore\n🔍 **Analyze relationships**: Understand how concepts connect to each other\n📝 **Create flashcards**: Make memorizing concepts easier\n🎯 **Generate quizzes**: Test your understanding of concepts\n\nWhich specific concept would you like to explore? Or I can find all important concepts in this lecture!`;
     }
     
     if (question.includes('học') || question.includes('phương pháp') || question.includes('cách học') || question.includes('study method') || question.includes('learning technique') || question.includes('how to study')) {
       return locale === 'vi'
         ? `Để học hiệu quả từ bài giảng "${filename}", mình khuyên bạn phương pháp học tập thông minh:\n\n📖 **Đọc hiểu**: Đọc kỹ phần tóm tắt trước, sau đó đi vào chi tiết\n🎯 **Tập trung**: Chia nhỏ bài học thành các phần dễ quản lý\n📝 **Ghi chú**: Tạo flashcard cho các khái niệm quan trọng\n🧠 **Luyện tập**: Làm quiz để kiểm tra và củng cố kiến thức\n🔄 **Ôn tập**: Ôn tập định kỳ theo phương pháp spaced repetition\n💡 **Áp dụng**: Liên hệ kiến thức với thực tế\n\nMình có thể giúp bạn thực hiện từng bước này! Bạn muốn bắt đầu từ phương pháp nào?`
         : `To study effectively from the "${filename}" lecture, I recommend this smart learning method:\n\n📖 **Comprehension**: Read the summary first, then dive into details\n🎯 **Focus**: Break down lessons into manageable parts\n📝 **Note-taking**: Create flashcards for important concepts\n🧠 **Practice**: Take quizzes to test and reinforce knowledge\n🔄 **Review**: Regular review using spaced repetition\n💡 **Application**: Connect knowledge with real-world examples\n\nI can help you implement each of these steps! Which method would you like to start with?`;
     }
     
     if (question.includes('khó') || question.includes('khó hiểu') || question.includes('không hiểu') || question.includes('difficult') || question.includes('confused') || question.includes('don\'t understand')) {
       return locale === 'vi'
         ? `Đừng lo lắng! Mình hiểu rằng học tập đôi khi có thể khó khăn. Hãy để mình giúp bạn:\n\n🔍 **Phân tích vấn đề**: Cho mình biết cụ thể phần nào bạn gặp khó khăn\n📚 **Giải thích đơn giản**: Mình sẽ giải thích lại bằng cách dễ hiểu hơn\n🎯 **Tạo ví dụ**: Đưa ra ví dụ thực tế để minh họa\n📝 **Tóm tắt lại**: Tóm tắt các điểm chính một cách rõ ràng\n🔄 **Luyện tập**: Tạo quiz để củng cố kiến thức\n\nBạn gặp khó khăn với phần nào cụ thể trong bài giảng "${filename}"? Mình sẽ giúp bạn hiểu rõ hơn!`
         : `Don't worry! I understand that learning can sometimes be challenging. Let me help you:\n\n🔍 **Analyze the problem**: Tell me specifically which part you're struggling with\n📚 **Simple explanation**: I'll explain it again in easier terms\n🎯 **Create examples**: Provide real-world examples to illustrate\n📝 **Summarize**: Summarize key points clearly\n🔄 **Practice**: Create quizzes to reinforce knowledge\n\nWhat specific part of the "${filename}" lecture are you having trouble with? I'll help you understand better!`;
     }
     
     // Enhanced quiz and practice requests
     if (question.includes('quiz') || question.includes('câu hỏi') || question.includes('kiểm tra') || question.includes('test') || question.includes('practice') || question.includes('luyện tập')) {
       return locale === 'vi'
         ? `Tuyệt vời! Mình có thể tạo quiz thông minh để giúp bạn luyện tập:\n\n🎯 **Quiz đa dạng**: Câu hỏi trắc nghiệm, điền từ, đúng/sai\n📊 **Theo dõi tiến độ**: Ghi nhận điểm số và cải thiện\n🎨 **Tùy chỉnh**: Chọn độ khó và chủ đề bạn muốn\n📈 **Phân tích**: Hiểu rõ điểm mạnh và điểm cần cải thiện\n🔄 **Lặp lại**: Ôn tập các câu hỏi sai\n\nBạn muốn quiz về chủ đề nào? Mình có thể tạo quiz từ toàn bộ bài giảng "${filename}" hoặc tập trung vào phần cụ thể!`
         : `Excellent! I can create smart quizzes to help you practice:\n\n🎯 **Diverse Quizzes**: Multiple choice, fill-in-the-blank, true/false questions\n📊 **Progress Tracking**: Record scores and improvements\n🎨 **Customization**: Choose difficulty and topics you want\n📈 **Analysis**: Understand strengths and areas for improvement\n🔄 **Repetition**: Review incorrect questions\n\nWhat topic would you like a quiz on? I can create quizzes from the entire "${filename}" lecture or focus on specific sections!`;
     }
     
     // Enhanced flashcard requests
     if (question.includes('flashcard') || question.includes('thẻ ghi nhớ') || question.includes('ghi nhớ') || question.includes('memorize') || question.includes('memory')) {
       return locale === 'vi'
         ? `Tuyệt vời! Mình có thể tạo flashcard thông minh để giúp bạn ghi nhớ:\n\n📝 **Flashcard đa dạng**: Định nghĩa, khái niệm, ví dụ, công thức\n🎯 **Học thông minh**: Sử dụng spaced repetition để ghi nhớ lâu\n📊 **Theo dõi**: Ghi nhận những thẻ bạn đã thuộc\n🔄 **Ôn tập**: Tự động nhắc lại những thẻ khó\n🎨 **Tùy chỉnh**: Thêm ghi chú và ví dụ cá nhân\n\nBạn muốn tạo flashcard cho chủ đề nào? Mình có thể tạo từ toàn bộ bài giảng "${filename}" hoặc tập trung vào phần cụ thể!`
         : `Excellent! I can create smart flashcards to help you memorize:\n\n📝 **Diverse Flashcards**: Definitions, concepts, examples, formulas\n🎯 **Smart Learning**: Use spaced repetition for long-term memory\n📊 **Tracking**: Record which cards you've mastered\n🔄 **Review**: Automatically repeat difficult cards\n🎨 **Customization**: Add personal notes and examples\n\nWhat topic would you like flashcards for? I can create from the entire "${filename}" lecture or focus on specific sections!`;
     }
     
     // If no specific match, provide enhanced helpful guidance
     return locale === 'vi'
       ? `Mình hiểu câu hỏi của bạn về bài giảng "${filename}"! Tài liệu này chứa nhiều thông tin hữu ích và mình có thể giúp bạn khám phá theo nhiều cách:\n\n🔍 **Tìm kiếm thông tin**: Hỏi về bất kỳ chủ đề cụ thể nào\n📝 **Tóm tắt thông minh**: Tóm tắt các phần quan trọng\n📚 **Giải thích khái niệm**: Hiểu rõ các định nghĩa và ý nghĩa\n🎯 **Tạo quiz**: Kiểm tra kiến thức với câu hỏi thông minh\n📋 **Tạo flashcard**: Ghi nhớ dễ dàng hơn\n💡 **Lời khuyên học tập**: Phương pháp học tập cá nhân hóa\n\nBạn muốn khám phá điều gì cụ thể? Mình sẵn sàng hỗ trợ bạn! 😊`
       : `I understand your question about the "${filename}" lecture! This material contains lots of useful information and I can help you explore it in many ways:\n\n🔍 **Information Search**: Ask about any specific topic\n📝 **Smart Summaries**: Summarize important sections\n📚 **Concept Explanation**: Understand definitions and meanings clearly\n🎯 **Quiz Creation**: Test knowledge with smart questions\n📋 **Flashcard Creation**: Make memorization easier\n💡 **Study Advice**: Personalized learning methods\n\nWhat would you like to explore specifically? I'm ready to support you! 😊`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen size={16} className="text-blue-600" />;
      case 'flashcard':
        return <Lightbulb size={16} className="text-yellow-600" />;
      case 'note':
        return <FileText size={16} className="text-green-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lecture':
        return locale === 'vi' ? 'Bài giảng' : 'Lecture';
      case 'flashcard':
        return 'Flashcard';
      case 'note':
        return locale === 'vi' ? 'Ghi chú' : 'Note';
      default:
        return locale === 'vi' ? 'Khác' : 'Other';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {t('search.searchAndChat')}
        </h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-4 font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            {t('search.smartSearch')}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 px-4 font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            {t('search.chatWithAI')}
          </button>
        </div>

        {activeTab === 'search' && (
          <div>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                {t('search.searchDescription')}
              </p>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('search.searchPlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search size={16} />
                  {isSearching ? t('search.searching') : t('search.search')}
                </motion.button>
              </div>
            </div>

            {results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {t('search.resultsFound')} ({results.length})
                </h3>
                
                <div className="space-y-4">
                  {results.map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(result.type)}
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-500">{t('search.relevance')}</span>
                          <div className="text-lg font-semibold text-blue-600">
                            {result.relevance}%
                          </div>
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-gray-800 mb-2">
                        {result.title}
                      </h4>
                      
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {result.content}
                      </p>
                      
                      <div className="mt-3 flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                          {t('search.viewDetails')}
                        </button>
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline">
                          {t('search.addToStudyPlan')}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {query && results.length === 0 && !isSearching && (
              <div className="text-center py-8">
                <Search size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {t('search.noResultsFound')}
                </h3>
                <p className="text-gray-500">
                  {t('search.adjustKeywords')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-96 flex flex-col">
            {/* Chat header with clear history button */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {t('search.chatWithAI')}
              </h3>
              {chatMessages.length > 1 && (
                <button
                  onClick={clearChatHistory}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  title={locale === 'vi' ? 'Xóa lịch sử chat' : 'Clear chat history'}
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('search.clearHistory')}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {chatMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-xs lg:max-w-md ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                                         <div className={`rounded-lg p-3 ${
                       message.type === 'user'
                         ? 'bg-blue-500 text-white'
                         : 'bg-gray-100 text-gray-800'
                     }`}>
                       <div className="text-sm">
                         {message.type === 'user' ? (
                           <p>{message.content}</p>
                         ) : (
                           <ReactMarkdown
                             className="prose prose-sm max-w-none prose-gray"
                             components={{
                               p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-800">{children}</p>,
                               strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                               em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                               ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-800">{children}</ul>,
                               ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-800">{children}</ol>,
                               li: ({ children }) => <li className="text-sm text-gray-800">{children}</li>,
                               blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-3 italic text-gray-600 bg-blue-50 py-1 rounded-r">{children}</blockquote>,
                               code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                               pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto text-gray-800">{children}</pre>
                             }}
                           >
                             {message.content}
                           </ReactMarkdown>
                         )}
                       </div>
                       <p className={`text-xs mt-2 ${
                         message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                       }`}>
                         {message.timestamp.toLocaleTimeString()}
                       </p>
                     </div>
                  </div>
                </motion.div>
              ))}
              
                             {isChatting && (
                 <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex justify-start"
                 >
                   <div className="flex items-start gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center">
                       <Bot size={16} />
                     </div>
                     <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                       <div className="flex items-center space-x-2">
                         <span className="text-sm text-gray-600">🤔</span>
                         <div className="flex space-x-1">
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                           <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                         </div>
                         <span className="text-xs text-gray-500">
                           {locale === 'vi' ? 'Đang suy nghĩ...' : 'Thinking...'}
                         </span>
                       </div>
                     </div>
                   </div>
                 </motion.div>
               )}
            </div>
            
                         <div className="flex gap-3">
                                <input
                   type="text"
                   value={chatInput}
                   onChange={(e) => setChatInput(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                   placeholder={t('search.chatPlaceholder')}
                   className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   disabled={isChatting}
                 />
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={handleChat}
                 disabled={isChatting || !chatInput.trim()}
                 className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Send size={16} />
               </motion.button>
             </div>
             
             {/* Enhanced Quick suggestion buttons */}
             {chatMessages.length <= 1 && (
               <div className="mt-4">
                 <p className="text-sm text-gray-600 mb-2">{t('search.quickSuggestions')}</p>
                 <div className="flex flex-wrap gap-2">
                   {(locale === 'vi' ? [
                     'Tóm tắt bài giảng',
                     'Các điểm chính là gì?',
                     'Tạo quiz cho tôi',
                     'Tạo flashcard',
                     'Làm sao để học hiệu quả?',
                     'Giải thích khái niệm khó'
                   ] : [
                     'Summarize the lecture',
                     'What are the main points?',
                     'Create a quiz for me',
                     'Create flashcards',
                     'How to study effectively?',
                     'Explain difficult concepts'
                   ]).map((suggestion, index) => (
                     <motion.button
                       key={index}
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={() => {
                         setChatInput(suggestion);
                         setTimeout(() => handleChat(), 100);
                       }}
                       className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-gray-700 px-3 py-2 rounded-full transition-all duration-200 border border-blue-200 hover:border-blue-300 shadow-sm"
                     >
                       {suggestion}
                     </motion.button>
                   ))}
                 </div>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartSearch;

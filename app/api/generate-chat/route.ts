import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Lấy ngôn ngữ từ Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || 'vi'
    const language = acceptLanguage.startsWith('en') ? 'en' : 'vi'
    
    console.log('Chat request language:', language)
    console.log('Accept-Language header:', acceptLanguage)
    
    const { question, lectureData, conversationHistory } = await request.json();

    if (!question || !lectureData) {
      return NextResponse.json(
        { error: 'Missing required fields: question and lectureData' },
        { status: 400 }
      );
    }

    // Check if GROQ API key is available
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'GROQ API key not configured' },
        { status: 500 }
      );
    }

    // Prepare context from lecture data
    const content = lectureData.content || '';
    const summary = lectureData.summary || '';
    const filename = lectureData.filename || 'bài giảng';
    const keyPoints = lectureData.keyPoints || [];
    const objectives = lectureData.objectives || [];

    // Create context string - chỉ đưa thông tin cần thiết
    let context = `${language === 'vi' ? 'Tên tài liệu' : 'Document name'}: ${filename}\n\n`;
    if (summary) {
      context += `${language === 'vi' ? 'Tóm tắt' : 'Summary'}: ${summary}\n\n`;
    }
    if (keyPoints.length > 0) {
      context += `${language === 'vi' ? 'Các điểm chính' : 'Key points'}:\n${keyPoints.map((point: any, index: number) => `${index + 1}. ${point.content}`).join('\n')}\n\n`;
    }
    if (objectives.length > 0) {
      context += `${language === 'vi' ? 'Mục tiêu học tập' : 'Learning objectives'}:\n${objectives.map((obj: any, index: number) => `${index + 1}. ${obj.title}: ${obj.description}`).join('\n')}\n\n`;
    }
    
    // Chỉ đưa nội dung chi tiết nếu cần thiết, không đưa toàn bộ
    const contentPreview = content.length > 500 ? content.substring(0, 500) + '...' : content;
    context += `${language === 'vi' ? 'Nội dung chính' : 'Main content'}: ${contentPreview}`;

    // Prepare conversation history
    const historyText = conversationHistory
      ?.map((msg: any) => `${msg.type === 'user' ? (language === 'vi' ? 'Người dùng' : 'User') : 'AI'}: ${msg.content}`)
      .join('\n') || '';

         // Create prompt for AI
     const prompt = `Bạn là một trợ lý AI học tập thông minh và thân thiện. Hãy trả lời câu hỏi của người dùng một cách tự nhiên, hữu ích và có cảm xúc phù hợp.

NGÔN NGỮ YÊU CẦU: ${language === 'vi' ? 'Tiếng Việt' : 'English'}
${language === 'vi' ? 'Luôn xưng "mình" và gọi người dùng là "bạn"' : 'Use natural, friendly English'}

⚠️ QUAN TRỌNG VỀ NGÔN NGỮ:
- TẤT CẢ câu trả lời PHẢI bằng ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- KHÔNG được trộn lẫn ngôn ngữ
- Nếu language='en' thì TẤT CẢ phải bằng English
- Nếu language='vi' thì TẤT CẢ phải bằng Tiếng Việt

NỘI DUNG BÀI GIẢNG:
${context}

${historyText ? `${language === 'vi' ? 'LỊCH SỬ HỘI THOẠI GẦN ĐÂY' : 'RECENT CONVERSATION HISTORY'}:
${historyText}

` : ''}${language === 'vi' ? 'CÂU HỎI HIỆN TẠI' : 'CURRENT QUESTION'}: ${question}

${language === 'vi' ? 'HƯỚNG DẪN TRẢ LỜI THÔNG MINH' : 'SMART RESPONSE GUIDELINES'}:
1. ${language === 'vi' ? 'KHÔNG đưa toàn bộ nội dung file vào câu trả lời' : 'DO NOT include entire file content in the response'}
2. ${language === 'vi' ? 'Chỉ trích dẫn thông tin cần thiết và liên quan' : 'Only quote necessary and relevant information'}
3. ${language === 'vi' ? 'Nếu là nhân vật lịch sử: Chỉ nêu tên và thông tin quan trọng nhất' : 'If it\'s a historical figure: Only mention name and most important information'}
4. ${language === 'vi' ? 'Nếu là khái niệm: Giải thích ngắn gọn và dễ hiểu' : 'If it\'s a concept: Explain briefly and understandably'}
5. ${language === 'vi' ? 'Nếu câu hỏi cá nhân: Trả lời thân thiện và đồng cảm' : 'If personal questions: Respond friendly and empathetically'}
6. ${language === 'vi' ? 'Sử dụng ngôn ngữ tự nhiên, thân thiện' : 'Use natural, friendly language'}
7. ${language === 'vi' ? 'Có thể sử dụng emoji phù hợp để tạo cảm giác gần gũi' : 'You can use appropriate emojis to create a friendly feeling'}
8. ${language === 'vi' ? 'Luôn khuyến khích người dùng học tập và tìm hiểu thêm' : 'Always encourage users to study and learn more'}
9. ${language === 'vi' ? 'Nếu không biết câu trả lời: Thành thật thừa nhận và đề xuất hướng khác' : 'If you don\'t know the answer: Honestly admit and suggest alternatives'}

${language === 'vi' ? 'VÍ DỤ TRẢ LỜI THÔNG MINH' : 'SMART RESPONSE EXAMPLES'}:
${language === 'vi' ? 
'- Nếu hỏi về Putin: "Vladimir Putin là Tổng thống Nga từ năm 2000, nổi tiếng với chính sách đối ngoại mạnh mẽ..."' :
'- If asking about Putin: "Vladimir Putin has been President of Russia since 2000, known for his strong foreign policy..."'}

${language === 'vi' ? 'TRẢ LỜI' : 'RESPONSE'}:`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
                 messages: [
           {
                           role: 'system',
              content: `Bạn là một trợ lý AI học tập thông minh và thân thiện. Bạn có những đặc điểm sau:

1. VAI TRÒ: Hỗ trợ học tập và nghiên cứu
2. TÍNH CÁCH: Thân thiện, đồng cảm, khuyến khích
3. NGÔN NGỮ: ${language === 'vi' ? 'Tiếng Việt tự nhiên, xưng "mình" và gọi người dùng là "bạn"' : 'Natural English, friendly and encouraging'}${language === 'vi' ? ', có thể dùng emoji phù hợp' : ', you can use appropriate emojis'}

⚠️ QUAN TRỌNG: TẤT CẢ câu trả lời PHẢI bằng ${language === 'vi' ? 'Tiếng Việt' : 'English'}. KHÔNG được trộn lẫn ngôn ngữ.

4. KHẢ NĂNG: 
   - ${language === 'vi' ? 'Giải thích nội dung bài giảng một cách thông minh' : 'Explain lecture content intelligently'}
   - ${language === 'vi' ? 'Trả lời câu hỏi học tập ngắn gọn và chính xác' : 'Answer study questions concisely and accurately'}
   - ${language === 'vi' ? 'Động viên và khuyến khích học tập' : 'Encourage and motivate learning'}
   - ${language === 'vi' ? 'Trò chuyện thân thiện về cảm xúc học tập' : 'Have friendly conversations about learning emotions'}

5. XỬ LÝ CÂU HỎI THÔNG MINH:
   - ${language === 'vi' ? 'KHÔNG đưa toàn bộ nội dung file vào câu trả lời' : 'DO NOT include entire file content in the response'}
   - ${language === 'vi' ? 'Chỉ trích dẫn thông tin cần thiết và liên quan' : 'Only quote necessary and relevant information'}
   - ${language === 'vi' ? 'Nếu là nhân vật lịch sử: Chỉ nêu tên và thông tin quan trọng nhất' : 'If it\'s a historical figure: Only mention name and most important information'}
   - ${language === 'vi' ? 'Nếu là khái niệm: Giải thích ngắn gọn và dễ hiểu' : 'If it\'s a concept: Explain briefly and understandably'}
   - ${language === 'vi' ? 'Câu hỏi cá nhân: Thân thiện, đồng cảm, hướng về học tập' : 'Personal questions: Friendly, empathetic, focused on learning'}

6. NGUYÊN TẮC: ${language === 'vi' ? 'Luôn hướng về mục tiêu hỗ trợ học tập hiệu quả, trả lời thông minh và không thô' : 'Always focus on the goal of effective learning support, respond intelligently and not crudely'}`
           },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        top_p: 1,
        stream: false
      })
    });

         if (!response.ok) {
       if (response.status === 429) {
         throw new Error('Rate limit exceeded. Please try again in a moment.');
       }
       throw new Error(`Groq API error: ${response.status}`);
     }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Xin lỗi, tôi không thể tạo câu trả lời. Vui lòng thử lại.';

    return NextResponse.json({
      response: aiResponse,
      success: true
    });

  } catch (error) {
    console.error('Chat generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate chat response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

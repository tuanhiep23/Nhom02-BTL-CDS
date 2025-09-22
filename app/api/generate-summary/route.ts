import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

type SummaryRequest = {
  text: string
  level: 'brief' | 'moderate' | 'detailed'
  language?: string
}

type SummaryResponse = {
  summary: string
  objectives: Array<{
    id: string
    title: string
    description: string
    category: string
    importance: 'high' | 'medium' | 'low'
    estimatedTime: number
    subObjectives: string[]
    prerequisites: string[]
  }>
  keyPoints: Array<{
    id: string
    content: string
    category: string
    difficulty: 'basic' | 'intermediate' | 'advanced'
    relatedConcepts: string[]
    explanation: string
    examples: string[]
    practiceQuestions: string[]
  }>
  insights: {
    difficulty: 'easy' | 'medium' | 'hard'
    estimatedReadTime: number
    keyConcepts: string[]
    recommendations: string[]
    strengths: string[]
    improvements: string[]
    learningPath?: {
      beginner: string[]
      intermediate: string[]
      advanced: string[]
    }
    assessment?: {
      knowledgeCheck: string[]
      practicalTasks: string[]
      criticalThinking: string[]
    }
    resources?: {
      additionalReading: string[]
      tools: string[]
      communities: string[]
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Lấy ngôn ngữ từ Accept-Language header
    const acceptLanguage = req.headers.get('accept-language') || 'vi'
    const body = (await req.json()) as SummaryRequest
    const { text, level = 'moderate' } = body
    const language = acceptLanguage.startsWith('en') ? 'en' : 'vi'
    
    console.log('Request language:', language)
    console.log('Accept-Language header:', acceptLanguage)
    console.log('Language detection logic:', acceptLanguage.startsWith('en') ? 'en' : 'vi')

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY on server' },
        { status: 500 }
      )
    }

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: 'Text content is required and should be at least 100 characters.' },
        { status: 400 }
      )
    }

         const groq = new Groq({
       apiKey: process.env.GROQ_API_KEY!
     })

     // Xử lý file dài - lấy phần đầu và cuối để có context đầy đủ
     let processedText = text
     if (text.length > 6000) {
       const startText = text.substring(0, 3000)
       const endText = text.substring(text.length - 1000)
       processedText = `${startText}\n\n... (nội dung giữa được bỏ qua do độ dài) ...\n\n${endText}`
       console.log('Text too long, using truncated version:', processedText.length, 'characters')
     }

         // Tạo prompt dựa trên mức độ chi tiết với yêu cầu cụ thể về độ dài
     const levelInstructions = {
       brief: language === 'vi' ? 
         "Tóm tắt ngắn gọn (200-300 từ), chỉ những điểm chính nhất từ nội dung thực tế của tài liệu" :
         "Brief summary (200-300 words), only the most important points from the actual content of the document",
       moderate: language === 'vi' ? 
         "Tóm tắt cân bằng (400-500 từ), bao gồm ý chính và chi tiết quan trọng từ nội dung thực tế" :
         "Balanced summary (400-500 words), including main ideas and important details from the actual content",
       detailed: language === 'vi' ? 
         "Tóm tắt chi tiết (600-800 từ), bao gồm tất cả khái niệm và chi tiết từ nội dung thực tế" :
         "Detailed summary (600-800 words), including all concepts and details from the actual content"
     }

         const prompt = `${language === 'vi' ? 'Bạn là một chuyên gia giáo dục và phân tích tài liệu học thuật. BẮT BUỘC trả lời bằng Tiếng Việt. Hãy phân tích nội dung sau và tạo ra một báo cáo học tập toàn diện.' : 'You are an educational expert and academic document analyst. MUST respond in English only. Please analyze the following content and create a comprehensive learning report.'}

⚠️ ${language === 'vi' ? 'CẢNH BÁO QUAN TRỌNG: KHÔNG ĐƯỢC COPY YÊU CẦU NÀY VÀO PHẦN SUMMARY. PHẢI VIẾT NỘI DUNG THỰC TẾ TỪ TÀI LIỆU.' : 'IMPORTANT WARNING: DO NOT COPY THIS REQUEST INTO THE SUMMARY SECTION. MUST WRITE ACTUAL CONTENT FROM THE DOCUMENT.'}

${language === 'vi' ? 'YÊU CẦU TÓM TẮT' : 'SUMMARY REQUIREMENT'}: ${levelInstructions[level]}
${language === 'vi' ? 'NGÔN NGỮ YÊU CẦU' : 'REQUESTED LANGUAGE'}: ${language === 'vi' ? 'Tiếng Việt' : 'English'}
🚨 ${language === 'vi' ? 'NGÔN NGỮ BẮT BUỘC:' : 'MANDATORY LANGUAGE:'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}

⚠️ ${language === 'vi' ? 'QUAN TRỌNG VỀ NGÔN NGỮ' : 'IMPORTANT ABOUT LANGUAGE'}:
- ${language === 'vi' ? 'TẤT CẢ nội dung trả về PHẢI bằng' : 'ALL returned content MUST be in'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'Summary, objectives, keyPoints, insights - TẤT CẢ phải bằng' : 'Summary, objectives, keyPoints, insights - ALL must be in'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'KHÔNG được trộn lẫn ngôn ngữ' : 'DO NOT mix languages'}
- ${language === 'vi' ? 'Nếu language=\'en\' thì TẤT CẢ phải bằng English' : 'If language=\'en\' then ALL must be in English'}
- ${language === 'vi' ? 'Nếu language=\'vi\' thì TẤT CẢ phải bằng Tiếng Việt' : 'If language=\'vi\' then ALL must be in Vietnamese'}
- ${language === 'vi' ? 'NGÔN NGỮ HIỆN TẠI ĐƯỢC YÊU CẦU:' : 'CURRENT REQUESTED LANGUAGE:'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'TUYỆT ĐỐI KHÔNG VIẾT BẰNG NGÔN NGỮ KHÁC' : 'ABSOLUTELY DO NOT WRITE IN OTHER LANGUAGES'}

${language === 'vi' ? 'QUY TẮC BẮT BUỘC VỀ NỘI DUNG' : 'MANDATORY CONTENT RULES'}:
- ${language === 'vi' ? 'Tóm tắt PHẢI dựa trên nội dung thực tế của tài liệu được cung cấp' : 'Summary MUST be based on the actual content of the provided document'}
- ${language === 'vi' ? 'PHẢI đề cập đến các ý chính, khái niệm, và chi tiết cụ thể từ tài liệu' : 'MUST mention main ideas, concepts, and specific details from the document'}
- ${language === 'vi' ? 'KHÔNG ĐƯỢC viết summary chung chung, phải liên quan trực tiếp đến nội dung tài liệu' : 'DO NOT write generic summary, must be directly related to document content'}
- ${language === 'vi' ? 'Tóm tắt phải có ít nhất' : 'Summary must have at least'} ${level === 'brief' ? '200' : level === 'moderate' ? '400' : '600'} ${language === 'vi' ? 'từ' : 'words'}
- ${language === 'vi' ? 'Ưu tiên nội dung chính xác và liên quan hơn là độ dài' : 'Prioritize accurate and relevant content over length'}

VÍ DỤ VỀ TÓM TẮT ĐÚNG NỘI DUNG:
${language === 'vi' ? 
'"Tài liệu này trình bày về Lab 1: Tiền xử lý và trực quan hóa dữ liệu. Bài lab tập trung vào việc phân tích Video Game Sales dataset chứa thông tin về hơn 16,500 trò chơi điện tử. Nội dung bao gồm chuẩn bị môi trường Python với Pandas, NumPy, Matplotlib, Seaborn. Các kỹ năng chính: làm sạch dữ liệu, xử lý giá trị thiếu, sửa đổi kiểu dữ liệu, kiểm tra và xóa dữ liệu trùng lặp, trực quan hóa qua biểu đồ phân tán, cột, đường, hộp. Tài liệu cung cấp hướng dẫn về cấu trúc dữ liệu Pandas Series và DataFrame."' :
'"This document presents Lab 1: Data Preprocessing and Visualization. The lab focuses on analyzing the Video Game Sales dataset containing information about over 16,500 video games. Content includes setting up Python environment with Pandas, NumPy, Matplotlib, Seaborn. Key skills: data cleaning, handling missing values, modifying data types, checking and removing duplicate data, visualization through scatter plots, bar charts, line charts, box plots. The document provides guidance on Pandas Series and DataFrame data structures."'
}

⚠️ ${language === 'vi' ? 'LƯU Ý: Đây là ví dụ về cách viết summary. Bạn phải viết summary thực tế dựa trên nội dung tài liệu được cung cấp, không copy ví dụ này.' : 'NOTE: This is an example of how to write a summary. You must write an actual summary based on the provided document content, do not copy this example.'}

${language === 'vi' ? 'HƯỚNG DẪN CHI TIẾT' : 'DETAILED GUIDELINES'}:
1. ${language === 'vi' ? 'Tóm tắt PHẢI dựa trên nội dung thực tế của tài liệu được cung cấp' : 'Summary MUST be based on the actual content of the provided document'}
2. ${language === 'vi' ? 'Đề cập đến các ý chính, khái niệm, và chi tiết cụ thể từ tài liệu' : 'Mention main ideas, concepts, and specific details from the document'}
3. ${language === 'vi' ? 'KHÔNG viết summary chung chung, phải liên quan trực tiếp đến nội dung tài liệu' : 'DO NOT write generic summary, must be directly related to document content'}
4. ${language === 'vi' ? 'Nêu rõ tên bài, chủ đề, và các điểm quan trọng từ tài liệu' : 'Clearly state the lesson name, topic, and important points from the document'}
5. ${language === 'vi' ? 'Bao gồm các khái niệm, định nghĩa, và ví dụ cụ thể từ tài liệu' : 'Include concepts, definitions, and specific examples from the document'}
6. ${language === 'vi' ? 'Tập trung vào nội dung thực tế thay vì giải thích chung chung' : 'Focus on actual content rather than general explanations'}

${language === 'vi' ? 'LƯU Ý QUAN TRỌNG' : 'IMPORTANT NOTES'}:
- ${language === 'vi' ? 'Tóm tắt PHẢI dựa trên nội dung thực tế của tài liệu được cung cấp' : 'Summary MUST be based on the actual content of the provided document'}
- ${language === 'vi' ? 'Đề cập đến các ý chính, khái niệm, và chi tiết cụ thể từ tài liệu' : 'Mention main ideas, concepts, and specific details from the document'}
- ${language === 'vi' ? 'KHÔNG viết summary chung chung, phải liên quan trực tiếp đến nội dung tài liệu' : 'DO NOT write generic summary, must be directly related to document content'}
- ${language === 'vi' ? 'Tập trung vào nội dung thực tế thay vì giải thích chung chung' : 'Focus on actual content rather than general explanations'}
- ${language === 'vi' ? 'Tóm tắt phải có ít nhất' : 'Summary must have at least'} ${level === 'brief' ? '200' : level === 'moderate' ? '400' : '600'} ${language === 'vi' ? 'từ' : 'words'}

${language === 'vi' ? 'PHÂN TÍCH AI CHI TIẾT' : 'DETAILED AI ANALYSIS'}:
- ${language === 'vi' ? 'Đánh giá độ khó và phù hợp với đối tượng học viên' : 'Assess difficulty and suitability for target learners'}
- ${language === 'vi' ? 'Phân tích cấu trúc và tổ chức nội dung' : 'Analyze content structure and organization'}
- ${language === 'vi' ? 'Đánh giá chất lượng và tính thực tế của tài liệu' : 'Evaluate document quality and practicality'}
- ${language === 'vi' ? 'Đề xuất phương pháp học tập hiệu quả' : 'Suggest effective learning methods'}
- ${language === 'vi' ? 'Xác định các điểm mạnh và điểm yếu' : 'Identify strengths and weaknesses'}
- ${language === 'vi' ? 'Đưa ra khuyến nghị cải thiện cụ thể' : 'Provide specific improvement recommendations'}

${language === 'vi' ? 'HƯỚNG DẪN CHI TIẾT CHO OBJECTIVES VÀ KEYPOINTS' : 'DETAILED GUIDELINES FOR OBJECTIVES AND KEYPOINTS'}:

${language === 'vi' ? 'OBJECTIVES - YÊU CẦU CỤ THỂ:' : 'OBJECTIVES - SPECIFIC REQUIREMENTS:'}:
- ${language === 'vi' ? 'title: Tên mục tiêu học tập cụ thể từ nội dung tài liệu, không phải tên chung chung' : 'title: Specific learning objective name from document content, not generic names'}
- ${language === 'vi' ? 'description: Mô tả chi tiết cách đạt được mục tiêu dựa trên nội dung tài liệu' : 'description: Detailed description of how to achieve the objective based on document content'}
- ${language === 'vi' ? 'estimatedTime: Thời gian ước tính thực tế để hoàn thành mục tiêu (phút)' : 'estimatedTime: Realistic estimated time to complete the objective (minutes)'}
- ${language === 'vi' ? 'subObjectives: 3-4 mục tiêu con cụ thể, chi tiết từ nội dung tài liệu, không phải placeholder' : 'subObjectives: 3-4 specific, detailed sub-objectives from document content, not placeholders'}
- ${language === 'vi' ? 'prerequisites: 2-3 điều kiện tiên quyết cụ thể từ nội dung tài liệu' : 'prerequisites: 2-3 specific prerequisites from document content'}

${language === 'vi' ? 'KEYPOINTS - YÊU CẦU CỤ THỂ:' : 'KEYPOINTS - SPECIFIC REQUIREMENTS:'}:
- ${language === 'vi' ? 'SỐ LƯỢNG: PHẢI tạo ít nhất 3-5 keyPoints khác nhau' : 'QUANTITY: MUST create at least 3-5 different keyPoints'}
- ${language === 'vi' ? 'content: Điểm chính quan trọng với giải thích chi tiết từ nội dung tài liệu' : 'content: Important key point with detailed explanation from document content'}
- ${language === 'vi' ? 'explanation: Giải thích chi tiết về điểm chính này dựa trên nội dung cụ thể từ tài liệu' : 'explanation: Detailed explanation of this key point based on specific content from the document'}
- ${language === 'vi' ? 'examples: 3 ví dụ cụ thể từ nội dung tài liệu, không phải placeholder' : 'examples: 3 specific examples from document content, not placeholders'}
- ${language === 'vi' ? 'practiceQuestions: 3 câu hỏi luyện tập cụ thể dựa trên nội dung tài liệu' : 'practiceQuestions: 3 specific practice questions based on document content'}
- ${language === 'vi' ? 'Mỗi keyPoint phải có nội dung khác nhau, không trùng lặp' : 'Each keyPoint must have different content, no duplicates'}

${language === 'vi' ? 'QUAN TRỌNG: TẤT CẢ nội dung phải dựa trên tài liệu được cung cấp, không được sử dụng placeholder hoặc nội dung chung chung' : 'IMPORTANT: ALL content must be based on the provided document, do not use placeholders or generic content'}

${language === 'vi' ? 'Trả về JSON với định dạng chính xác sau' : 'Return JSON with the following exact format'}:
🚨 ${language === 'vi' ? 'LƯU Ý: TẤT CẢ nội dung trong JSON PHẢI bằng' : 'NOTE: ALL content in JSON MUST be in'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
{
  "summary": "${language === 'vi' ? 'VIẾT TÓM TẮT THỰC TẾ Ở ĐÂY - KHÔNG COPY YÊU CẦU NÀY. Tóm tắt phải đề cập đến nội dung cụ thể từ tài liệu, ví dụ: \'Tài liệu này trình bày về Lab 1: Tiền xử lý và trực quan hóa dữ liệu. Bài lab tập trung vào việc phân tích Video Game Sales dataset chứa thông tin về hơn 16,500 trò chơi điện tử...\'' : 'WRITE ACTUAL SUMMARY HERE - DO NOT COPY THIS REQUEST. Summary must mention specific content from the document, example: \'This document presents Lab 1: Data Preprocessing and Visualization. The lab focuses on analyzing the Video Game Sales dataset containing information about over 16,500 video games...\''}",
  "objectives": [
    {
      "id": "obj_1",
      "title": "${language === 'vi' ? 'Tên mục tiêu học tập cụ thể từ nội dung tài liệu' : 'Specific learning objective name from document content'}",
      "description": "${language === 'vi' ? 'Mô tả chi tiết mục tiêu và cách đạt được dựa trên nội dung tài liệu' : 'Detailed description of objective and how to achieve it based on document content'}",
      "category": "${language === 'vi' ? 'Danh mục (Kiến thức cơ bản/Ứng dụng/Tư duy phản biện)' : 'Category (Basic Knowledge/Application/Critical Thinking)'}",
      "importance": "high|medium|low",
      "estimatedTime": 30,
      "subObjectives": [
        "${language === 'vi' ? 'Mục tiêu con cụ thể 1 dựa trên nội dung tài liệu' : 'Specific sub-objective 1 based on document content'}",
        "${language === 'vi' ? 'Mục tiêu con cụ thể 2 dựa trên nội dung tài liệu' : 'Specific sub-objective 2 based on document content'}",
        "${language === 'vi' ? 'Mục tiêu con cụ thể 3 dựa trên nội dung tài liệu' : 'Specific sub-objective 3 based on document content'}"
      ],
      "prerequisites": [
        "${language === 'vi' ? 'Điều kiện tiên quyết cụ thể 1 từ nội dung tài liệu' : 'Specific prerequisite 1 from document content'}",
        "${language === 'vi' ? 'Điều kiện tiên quyết cụ thể 2 từ nội dung tài liệu' : 'Specific prerequisite 2 from document content'}"
      ]
    }
  ],
  "keyPoints": [
    {
      "id": "key_1", 
      "content": "${language === 'vi' ? 'Điểm chính quan trọng 1 với giải thích chi tiết từ nội dung tài liệu' : 'Important key point 1 with detailed explanation from document content'}",
      "category": "${language === 'vi' ? 'Danh mục chủ đề 1' : 'Topic category 1'}",
      "difficulty": "basic|intermediate|advanced",
      "relatedConcepts": ["${language === 'vi' ? 'khái niệm liên quan 1 từ tài liệu' : 'related concept 1 from document'}", "${language === 'vi' ? 'khái niệm 2 từ tài liệu' : 'concept 2 from document'}"],
      "explanation": "${language === 'vi' ? 'Giải thích chi tiết về điểm chính 1 này dựa trên nội dung cụ thể từ tài liệu' : 'Detailed explanation of key point 1 based on specific content from the document'}",
      "examples": [
        "${language === 'vi' ? 'Ví dụ cụ thể 1 từ nội dung tài liệu' : 'Specific example 1 from document content'}",
        "${language === 'vi' ? 'Ví dụ cụ thể 2 từ nội dung tài liệu' : 'Specific example 2 from document content'}",
        "${language === 'vi' ? 'Ví dụ cụ thể 3 từ nội dung tài liệu' : 'Specific example 3 from document content'}"
      ],
      "practiceQuestions": [
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 1 dựa trên nội dung tài liệu' : 'Specific practice question 1 based on document content'}",
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 2 dựa trên nội dung tài liệu' : 'Specific practice question 2 based on document content'}",
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 3 dựa trên nội dung tài liệu' : 'Specific practice question 3 based on document content'}"
      ]
    },
    {
      "id": "key_2", 
      "content": "${language === 'vi' ? 'Điểm chính quan trọng 2 với giải thích chi tiết từ nội dung tài liệu' : 'Important key point 2 with detailed explanation from document content'}",
      "category": "${language === 'vi' ? 'Danh mục chủ đề 2' : 'Topic category 2'}",
      "difficulty": "basic|intermediate|advanced",
      "relatedConcepts": ["${language === 'vi' ? 'khái niệm liên quan 3 từ tài liệu' : 'related concept 3 from document'}", "${language === 'vi' ? 'khái niệm 4 từ tài liệu' : 'concept 4 from document'}"],
      "explanation": "${language === 'vi' ? 'Giải thích chi tiết về điểm chính 2 này dựa trên nội dung cụ thể từ tài liệu' : 'Detailed explanation of key point 2 based on specific content from the document'}",
      "examples": [
        "${language === 'vi' ? 'Ví dụ cụ thể 4 từ nội dung tài liệu' : 'Specific example 4 from document content'}",
        "${language === 'vi' ? 'Ví dụ cụ thể 5 từ nội dung tài liệu' : 'Specific example 5 from document content'}",
        "${language === 'vi' ? 'Ví dụ cụ thể 6 từ nội dung tài liệu' : 'Specific example 6 from document content'}"
      ],
      "practiceQuestions": [
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 4 dựa trên nội dung tài liệu' : 'Specific practice question 4 based on document content'}",
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 5 dựa trên nội dung tài liệu' : 'Specific practice question 5 based on document content'}",
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 6 dựa trên nội dung tài liệu' : 'Specific practice question 6 based on document content'}"
      ]
    },
    {
      "id": "key_3", 
      "content": "${language === 'vi' ? 'Điểm chính quan trọng 3 với giải thích chi tiết từ nội dung tài liệu' : 'Important key point 3 with detailed explanation from document content'}",
      "category": "${language === 'vi' ? 'Danh mục chủ đề 3' : 'Topic category 3'}",
      "difficulty": "basic|intermediate|advanced",
      "relatedConcepts": ["${language === 'vi' ? 'khái niệm liên quan 5 từ tài liệu' : 'related concept 5 from document'}", "${language === 'vi' ? 'khái niệm 6 từ tài liệu' : 'concept 6 from document'}"],
      "explanation": "${language === 'vi' ? 'Giải thích chi tiết về điểm chính 3 này dựa trên nội dung cụ thể từ tài liệu' : 'Detailed explanation of key point 3 based on specific content from the document'}",
      "examples": [
        "${language === 'vi' ? 'Ví dụ cụ thể 7 từ nội dung tài liệu' : 'Specific example 7 from document content'}",
        "${language === 'vi' ? 'Ví dụ cụ thể 8 từ nội dung tài liệu' : 'Specific example 8 from document content'}",
        "${language === 'vi' ? 'Ví dụ cụ thể 9 từ nội dung tài liệu' : 'Specific example 9 from document content'}"
      ],
      "practiceQuestions": [
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 7 dựa trên nội dung tài liệu' : 'Specific practice question 7 based on document content'}",
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 8 dựa trên nội dung tài liệu' : 'Specific practice question 8 based on document content'}",
        "${language === 'vi' ? 'Câu hỏi luyện tập cụ thể 9 dựa trên nội dung tài liệu' : 'Specific practice question 9 based on document content'}"
      ]
    }
  ],
  "insights": {
    "difficulty": "easy|medium|hard",
    "estimatedReadTime": ${language === 'vi' ? 'số_phút_đọc' : 'reading_time_minutes'},
    "keyConcepts": ["${language === 'vi' ? 'khái niệm chính 1' : 'key concept 1'}", "${language === 'vi' ? 'khái niệm 2' : 'concept 2'}", "${language === 'vi' ? 'khái niệm 3' : 'concept 3'}"],
    "recommendations": [
      "${language === 'vi' ? 'Gợi ý học tập chi tiết 1 với lý do cụ thể' : 'Detailed learning suggestion 1 with specific reasons'}",
      "${language === 'vi' ? 'Gợi ý 2 với phương pháp thực hiện' : 'Suggestion 2 with implementation method'}",
      "${language === 'vi' ? 'Gợi ý 3 với thời gian và tần suất' : 'Suggestion 3 with time and frequency'}",
      "${language === 'vi' ? 'Gợi ý 4 về tài liệu tham khảo bổ sung' : 'Suggestion 4 about additional reference materials'}",
      "${language === 'vi' ? 'Gợi ý 5 về cách đánh giá tiến độ' : 'Suggestion 5 about how to assess progress'}"
    ],
    "strengths": [
      "${language === 'vi' ? 'Điểm mạnh của tài liệu 1 với giải thích chi tiết' : 'Document strength 1 with detailed explanation'}",
      "${language === 'vi' ? 'Điểm mạnh 2 với ví dụ cụ thể' : 'Strength 2 with specific example'}",
      "${language === 'vi' ? 'Điểm mạnh 3 về tính ứng dụng thực tế' : 'Strength 3 about practical application'}",
      "${language === 'vi' ? 'Điểm mạnh 4 về cấu trúc và tổ chức' : 'Strength 4 about structure and organization'}",
      "${language === 'vi' ? 'Điểm mạnh 5 về độ cập nhật và chính xác' : 'Strength 5 about currency and accuracy'}"
    ],
    "improvements": [
      "${language === 'vi' ? 'Điểm cần cải thiện 1 với đề xuất cụ thể' : 'Improvement area 1 with specific suggestions'}",
      "${language === 'vi' ? 'Cải thiện 2 với phương pháp thực hiện' : 'Improvement 2 with implementation method'}",
      "${language === 'vi' ? 'Cải thiện 3 về nội dung bổ sung' : 'Improvement 3 about additional content'}",
      "${language === 'vi' ? 'Cải thiện 4 về hình thức trình bày' : 'Improvement 4 about presentation format'}",
      "${language === 'vi' ? 'Cải thiện 5 về tính tương tác' : 'Improvement 5 about interactivity'}"
    ],
    "learningPath": {
      "beginner": [
        "${language === 'vi' ? 'Bước 1: Đọc hiểu khái niệm cơ bản' : 'Step 1: Understand basic concepts'}",
        "${language === 'vi' ? 'Bước 2: Làm quen với thuật ngữ chính' : 'Step 2: Familiarize with key terminology'}",
        "${language === 'vi' ? 'Bước 3: Thực hành với ví dụ đơn giản' : 'Step 3: Practice with simple examples'}"
      ],
      "intermediate": [
        "${language === 'vi' ? 'Bước 1: Phân tích sâu các khái niệm' : 'Step 1: Deep analysis of concepts'}",
        "${language === 'vi' ? 'Bước 2: Áp dụng vào tình huống thực tế' : 'Step 2: Apply to real situations'}",
        "${language === 'vi' ? 'Bước 3: So sánh và đối chiếu các phương pháp' : 'Step 3: Compare and contrast different methods'}"
      ],
      "advanced": [
        "${language === 'vi' ? 'Bước 1: Nghiên cứu chuyên sâu' : 'Step 1: In-depth research'}",
        "${language === 'vi' ? 'Bước 2: Phát triển ứng dụng mới' : 'Step 2: Develop new applications'}",
        "${language === 'vi' ? 'Bước 3: Đánh giá và cải tiến' : 'Step 3: Evaluate and improve'}"
      ]
    },
    "assessment": {
      "knowledgeCheck": [
        "${language === 'vi' ? 'Câu hỏi kiểm tra kiến thức 1' : 'Knowledge check question 1'}",
        "${language === 'vi' ? 'Câu hỏi kiểm tra kiến thức 2' : 'Knowledge check question 2'}",
        "${language === 'vi' ? 'Câu hỏi kiểm tra kiến thức 3' : 'Knowledge check question 3'}"
      ],
      "practicalTasks": [
        "${language === 'vi' ? 'Bài tập thực hành 1 với hướng dẫn' : 'Practical task 1 with guidance'}",
        "${language === 'vi' ? 'Bài tập thực hành 2 với mục tiêu' : 'Practical task 2 with objectives'}",
        "${language === 'vi' ? 'Bài tập thực hành 3 với đánh giá' : 'Practical task 3 with assessment'}"
      ],
      "criticalThinking": [
        "${language === 'vi' ? 'Câu hỏi tư duy phản biện 1' : 'Critical thinking question 1'}",
        "${language === 'vi' ? 'Câu hỏi tư duy phản biện 2' : 'Critical thinking question 2'}",
        "${language === 'vi' ? 'Câu hỏi tư duy phản biện 3' : 'Critical thinking question 3'}"
      ]
    },
    "resources": {
      "additionalReading": [
        "${language === 'vi' ? 'Tài liệu tham khảo 1 với mô tả' : 'Reference material 1 with description'}",
        "${language === 'vi' ? 'Tài liệu tham khảo 2 với mô tả' : 'Reference material 2 with description'}",
        "${language === 'vi' ? 'Tài liệu tham khảo 3 với mô tả' : 'Reference material 3 with description'}"
      ],
      "tools": [
        "${language === 'vi' ? 'Công cụ hỗ trợ 1 với cách sử dụng' : 'Support tool 1 with usage instructions'}",
        "${language === 'vi' ? 'Công cụ hỗ trợ 2 với cách sử dụng' : 'Support tool 2 with usage instructions'}",
        "${language === 'vi' ? 'Công cụ hỗ trợ 3 với cách sử dụng' : 'Support tool 3 with usage instructions'}"
      ],
      "communities": [
        "${language === 'vi' ? 'Cộng đồng học tập 1 với mô tả' : 'Learning community 1 with description'}",
        "${language === 'vi' ? 'Cộng đồng học tập 2 với mô tả' : 'Learning community 2 with description'}",
        "${language === 'vi' ? 'Cộng đồng học tập 3 với mô tả' : 'Learning community 3 with description'}"
      ]
    }
  }
}

${language === 'vi' ? 'NỘI DUNG CẦN PHÂN TÍCH' : 'CONTENT TO ANALYZE'}:
"""
${processedText}
"""

🚨 ${language === 'vi' ? 'CẢNH BÁO CUỐI CÙNG:' : 'FINAL WARNING:'}
- ${language === 'vi' ? 'NGÔN NGỮ YÊU CẦU:' : 'REQUESTED LANGUAGE:'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'TẤT CẢ nội dung JSON PHẢI bằng' : 'ALL JSON content MUST be in'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'KHÔNG ĐƯỢC VIẾT BẰNG NGÔN NGỮ KHÁC' : 'DO NOT WRITE IN OTHER LANGUAGES'}

⚠️ ${language === 'vi' ? 'YÊU CẦU CUỐI CÙNG' : 'FINAL REQUIREMENTS'}: 
- ${language === 'vi' ? 'ĐỌC KỸ nội dung tài liệu trên' : 'READ CAREFULLY the content above'}
- ${language === 'vi' ? 'VIẾT TÓM TẮT THỰC TẾ về nội dung đó' : 'WRITE ACTUAL SUMMARY about that content'}
- ${language === 'vi' ? 'KHÔNG COPY YÊU CẦU NÀY VÀO SUMMARY' : 'DO NOT COPY THIS REQUEST INTO SUMMARY'}
- ${language === 'vi' ? 'SUMMARY PHẢI CÓ ÍT NHẤT' : 'SUMMARY MUST HAVE AT LEAST'} ${level === 'brief' ? '200' : level === 'moderate' ? '400' : '600'} ${language === 'vi' ? 'TỪ' : 'WORDS'}

${language === 'vi' ? 'QUAN TRỌNG' : 'IMPORTANT'}: 
- ${language === 'vi' ? 'Chỉ trả về JSON thuần túy, KHÔNG có bất kỳ text nào khác trước hoặc sau JSON' : 'Return only pure JSON, NO other text before or after JSON'}
- ${language === 'vi' ? 'Không có lời giới thiệu, không có giải thích, chỉ có JSON object duy nhất' : 'No introduction, no explanation, only the single JSON object'}
- ${language === 'vi' ? 'TRONG PHẦN "summary", VIẾT NỘI DUNG THỰC TẾ TỪ TÀI LIỆU, KHÔNG COPY YÊU CẦU NÀY' : 'IN THE "summary" SECTION, WRITE ACTUAL CONTENT FROM THE DOCUMENT, DO NOT COPY THIS REQUEST'}
- ${language === 'vi' ? 'Tóm tắt PHẢI dựa trên nội dung thực tế của tài liệu được cung cấp' : 'Summary MUST be based on the actual content of the provided document'}
- ${language === 'vi' ? 'Đề cập đến các ý chính, khái niệm, và chi tiết cụ thể từ tài liệu' : 'Mention main ideas, concepts, and specific details from the document'}
- ${language === 'vi' ? 'KHÔNG viết summary chung chung, phải liên quan trực tiếp đến nội dung tài liệu' : 'DO NOT write generic summary, must be directly related to document content'}
- ${language === 'vi' ? 'PHẢI viết ít nhất' : 'MUST write at least'} ${level === 'brief' ? '200' : level === 'moderate' ? '400' : '600'} ${language === 'vi' ? 'từ cho phần summary' : 'words for the summary section'}

🚨 ${language === 'vi' ? 'CẢNH BÁO CUỐI CÙNG VỀ NGÔN NGỮ' : 'FINAL LANGUAGE WARNING'}:
- ${language === 'vi' ? 'NGÔN NGỮ YÊU CẦU:' : 'REQUESTED LANGUAGE:'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'TẤT CẢ nội dung JSON PHẢI bằng' : 'ALL JSON content MUST be in'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'KHÔNG ĐƯỢC VIẾT BẰNG NGÔN NGỮ KHÁC' : 'DO NOT WRITE IN OTHER LANGUAGES'}
- ${language === 'vi' ? 'TUYỆT ĐỐI TUÂN THỦ YÊU CẦU NGÔN NGỮ' : 'ABSOLUTELY FOLLOW LANGUAGE REQUIREMENT'}
- ${language === 'vi' ? 'NGÔN NGỮ HIỆN TẠI:' : 'CURRENT LANGUAGE:'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- ${language === 'vi' ? 'BẮT BUỘC VIẾT BẰNG:' : 'MUST WRITE IN:'} ${language === 'vi' ? 'Tiếng Việt' : 'English'}

🚨 ${language === 'vi' ? 'CẢNH BÁO CUỐI CÙNG VỀ KEYPOINTS' : 'FINAL KEYPOINTS WARNING'}:
- ${language === 'vi' ? 'PHẢI tạo ít nhất 3-5 keyPoints khác nhau' : 'MUST create at least 3-5 different keyPoints'}
- ${language === 'vi' ? 'KHÔNG ĐƯỢC chỉ tạo 1 keyPoint' : 'DO NOT create only 1 keyPoint'}
- ${language === 'vi' ? 'Mỗi keyPoint phải có nội dung khác nhau' : 'Each keyPoint must have different content'}
- ${language === 'vi' ? 'TẤT CẢ keyPoints phải dựa trên nội dung tài liệu' : 'ALL keyPoints must be based on document content'}

🚨 ${language === 'vi' ? 'CẢNH BÁO QUAN TRỌNG VỀ NỘI DUNG' : 'IMPORTANT CONTENT WARNING'}:
- ${language === 'vi' ? 'KHÔNG ĐƯỢC sử dụng placeholder như "Mục tiêu con 1", "Ví dụ 1", "Câu hỏi 1"' : 'DO NOT use placeholders like "Sub-objective 1", "Example 1", "Question 1"'}
- ${language === 'vi' ? 'PHẢI viết nội dung thực tế từ tài liệu cho tất cả các trường' : 'MUST write actual content from the document for all fields'}
- ${language === 'vi' ? 'subObjectives, prerequisites, examples, practiceQuestions PHẢI có nội dung cụ thể' : 'subObjectives, prerequisites, examples, practiceQuestions MUST have specific content'}
- ${language === 'vi' ? 'KHÔNG ĐƯỢC copy placeholder text từ template' : 'DO NOT copy placeholder text from template'}
- ${language === 'vi' ? 'KEYPOINTS: PHẢI tạo ít nhất 3-5 keyPoints khác nhau, không được chỉ có 1 keyPoint' : 'KEYPOINTS: MUST create at least 3-5 different keyPoints, do not create only 1 keyPoint'}`

         console.log('Generating summary with level:', level)
     console.log('Text length:', text.length)

    // Retry với fallback cho summary API
    let aiResponse = ''
    let retryCount = 0
    const maxRetries = 3
    let finalPrompt = prompt
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Summary generation attempt ${retryCount + 1}/${maxRetries}`)
        
        // Nếu retry lần thứ 2 trở đi, sử dụng prompt mạnh hơn
        if (retryCount > 0) {
          finalPrompt = prompt + `

${language === 'vi' ? 'LƯU Ý QUAN TRỌNG CHO LẦN THỬ LẠI' : 'IMPORTANT NOTE FOR RETRY'}:
- ${language === 'vi' ? 'Tóm tắt trước đó quá ngắn, bạn PHẢI viết dài hơn' : 'Previous summary was too short, you MUST write longer'}
- ${language === 'vi' ? 'TỐI THIỂU' : 'MINIMUM'} ${level === 'brief' ? '400' : level === 'moderate' ? '800' : '1200'} ${language === 'vi' ? 'từ cho tóm tắt' : 'words for summary'}
- ${language === 'vi' ? 'Mở rộng mọi ý tưởng và giải thích chi tiết' : 'Expand all ideas and explain in detail'}
- ${language === 'vi' ? 'KHÔNG ĐƯỢC viết tóm tắt ngắn gọn' : 'DO NOT write short summary'}`
        }
        
                         const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant that MUST respond in ${language === 'vi' ? 'Vietnamese' : 'English'} only. NEVER mix languages. The user's requested language is ${language === 'vi' ? 'Vietnamese' : 'English'}.`
            },
            {
              role: 'user',
              content: finalPrompt
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.05,
          max_tokens: 8000,
          top_p: 0.9
        })
        
        aiResponse = chatCompletion.choices[0]?.message?.content || ''
        console.log('AI Response length:', aiResponse.length)
        console.log('AI Response preview:', aiResponse.substring(0, 200))
        
        // Kiểm tra xem response có chứa JSON không
        if (aiResponse.includes('{') && aiResponse.includes('}')) {
          console.log(`Response contains JSON, proceeding to parse`)
          break
        } else {
          console.log(`Response doesn't contain valid JSON structure`)
          retryCount++
          if (retryCount >= maxRetries) {
            console.log('Max retries reached, response still invalid')
            break
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
        
      } catch (apiError: any) {
        retryCount++
        console.error(`Summary API failed (attempt ${retryCount}):`, apiError.message)
        
        if (retryCount >= maxRetries) {
          console.log('Max retries reached for summary, using enhanced fallback')
          aiResponse = ''
          break
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }

    console.log('AI summary response received')

    // Parse AI response
    let parsedResponse: SummaryResponse
    
    // If AI response is empty (due to quota/errors), go directly to fallback
    if (!aiResponse || aiResponse.trim() === '') {
      console.log('AI response is empty, using enhanced fallback response')
      parsedResponse = null as any
    } else {
      try {
        // Tìm JSON trong response
        let jsonStart = aiResponse.indexOf('{')
        let jsonEnd = aiResponse.lastIndexOf('}')
        
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('No JSON structure found in response')
        }
        
        // Trích xuất JSON
        let jsonString = aiResponse.substring(jsonStart, jsonEnd + 1)
        
        // Loại bỏ markdown code blocks nếu có
        jsonString = jsonString.replace(/^```json\n?/i, '').replace(/\n?```$/i, '')
        
        // Loại bỏ các ký tự control không hợp lệ trong JSON
        jsonString = jsonString.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        
        // Thay thế các ký tự newline và tab trong string values
        jsonString = jsonString.replace(/\n/g, '\\n').replace(/\t/g, '\\t')
        
        console.log('Extracted JSON string length:', jsonString.length)
        console.log('JSON preview:', jsonString.substring(0, 200))
        
        parsedResponse = JSON.parse(jsonString)
        console.log('Successfully parsed AI response')
        
                 // Kiểm tra độ dài summary sau khi parse
         const summaryWordCount = parsedResponse.summary?.split(/\s+/).length || 0
         const minRequiredWords = level === 'brief' ? 150 : level === 'moderate' ? 200 : 400
         
         console.log(`Parsed summary word count: ${summaryWordCount}, required: ${minRequiredWords}`)
         console.log(`Summary preview: ${parsedResponse.summary?.substring(0, 200)}...`)
         
         // Chỉ sử dụng fallback nếu summary quá ngắn hoặc không có nội dung
         if (!parsedResponse.summary || parsedResponse.summary.length < 100 || summaryWordCount < 100) {
           console.log('Summary too short or empty after parsing, will use fallback')
           parsedResponse = null as any
         } else {
           console.log('AI response is valid, using it instead of fallback')
         }
        
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        console.error('Raw AI response preview:', aiResponse.substring(0, 500))
        parsedResponse = null as any
      }
    }

         // Kiểm tra độ dài tóm tắt và retry nếu cần
     const minSummaryLength = level === 'brief' ? 150 : level === 'moderate' ? 200 : 400
     const summaryWordCount = parsedResponse?.summary?.split(/\s+/).length || 0
     
     console.log('Final check - parsedResponse exists:', !!parsedResponse)
     console.log('Final check - summary exists:', !!parsedResponse?.summary)
     console.log('Final check - summary length:', parsedResponse?.summary?.length || 0)
     console.log('Final check - summary word count:', summaryWordCount)
     console.log('Final check - min required:', minSummaryLength)
     
     if (!parsedResponse || !parsedResponse.summary || parsedResponse.summary.length < 100 || summaryWordCount < 100) {
      console.log('Generating enhanced fallback response')
      
      // Enhanced fallback response dựa trên nội dung thật
      const wordCount = text.split(/\s+/).length
      const estimatedTime = Math.max(5, Math.round(wordCount / 150))
      
      // Trích xuất một số từ khóa từ content
      const keywords = text.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4)
        .slice(0, 15)
        .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were', 'their', 'there', 'these', 'those'].includes(word))
      
             const levelText = level === 'brief' ? (language === 'vi' ? 'ngắn gọn' : 'brief') : 
                        level === 'detailed' ? (language === 'vi' ? 'chi tiết' : 'detailed') : 
                        (language === 'vi' ? 'tổng quan' : 'moderate')
      
                           // Tạo tóm tắt fallback dựa trên nội dung thực tế của file
        const firstFewWords = text.substring(0, 1000).toLowerCase()
        const isDataScience = firstFewWords.includes('pandas') || firstFewWords.includes('data') || firstFewWords.includes('dữ liệu')
        const isProgramming = firstFewWords.includes('python') || firstFewWords.includes('code') || firstFewWords.includes('lập trình')
        const isLab = firstFewWords.includes('lab') || firstFewWords.includes('thực hành') || firstFewWords.includes('bài tập')
        const isVideoGame = firstFewWords.includes('video game') || firstFewWords.includes('game') || firstFewWords.includes('trò chơi')
        const isVisualization = firstFewWords.includes('trực quan') || firstFewWords.includes('visualization') || firstFewWords.includes('biểu đồ')
        const isPreprocessing = firstFewWords.includes('tiền xử lý') || firstFewWords.includes('preprocessing') || firstFewWords.includes('làm sạch')
        
        let topicDescription = language === 'vi' ? 'chủ đề chính' : 'main topic'
        if (isDataScience && isLab) topicDescription = language === 'vi' ? 'thực hành khoa học dữ liệu và phân tích' : 'data science practice and analysis'
        else if (isDataScience) topicDescription = language === 'vi' ? 'khoa học dữ liệu và phân tích' : 'data science and analysis'
        else if (isProgramming) topicDescription = language === 'vi' ? 'lập trình và phát triển' : 'programming and development'
        else if (isLab) topicDescription = language === 'vi' ? 'thực hành và bài tập' : 'practice and exercises'
        
        let specificContent = ''
        if (isVideoGame) specificContent = language === 'vi' ? 'về dữ liệu Video Game Sales' : 'about Video Game Sales data'
        if (isVisualization) specificContent = language === 'vi' ? 'về trực quan hóa dữ liệu' : 'about data visualization'
        if (isPreprocessing) specificContent = language === 'vi' ? 'về tiền xử lý dữ liệu' : 'about data preprocessing'
       
               const fallbackSummary = language === 'vi' ? 
          `Tài liệu này chứa ${wordCount} từ với nội dung ${levelText} về ${topicDescription}${specificContent ? ' ' + specificContent : ''}. 

Dựa trên phân tích nội dung, tài liệu này tập trung vào việc cung cấp kiến thức thực tế và hướng dẫn chi tiết cho người học về ${topicDescription}. Nội dung được cấu trúc rõ ràng với các phần chính và phụ, bao gồm các khái niệm quan trọng và thông tin hữu ích cho việc học tập.

Các điểm nổi bật trong tài liệu bao gồm:
- Thông tin cơ bản về ${topicDescription} được trình bày một cách có hệ thống và dễ hiểu
- Các định nghĩa và giải thích chi tiết về các thuật ngữ quan trọng, giúp người đọc hiểu sâu về bản chất của vấn đề
- Ví dụ và minh họa thực tế để hỗ trợ việc hiểu biết và áp dụng kiến thức vào thực tế
- Phân tích và đánh giá các khía cạnh khác nhau của chủ đề, cung cấp góc nhìn toàn diện
- Kết luận và ứng dụng thực tế của kiến thức được trình bày, giúp người học thấy được giá trị thực tiễn

Tài liệu này phù hợp cho việc học tập và nghiên cứu, cung cấp nền tảng kiến thức vững chắc cho người đọc. Với độ dài ${wordCount} từ, tài liệu yêu cầu thời gian đọc và nghiên cứu khoảng ${estimatedTime} phút để hiểu đầy đủ nội dung. Mặc dù AI service tạm thời không khả dụng để phân tích chi tiết hơn, bạn vẫn có thể sử dụng các tính năng khác như tạo flashcard và quiz để tối ưu hóa việc học tập từ nội dung này.

Để học hiệu quả từ tài liệu này, bạn nên:
- Đọc kỹ từng phần và ghi chú các điểm quan trọng
- Tạo sơ đồ tư duy để kết nối các khái niệm
- Thực hành với các ví dụ được cung cấp
- Ôn tập định kỳ để củng cố kiến thức` :
          `This document contains ${wordCount} words with ${levelText} content about ${topicDescription}${specificContent ? ' ' + specificContent : ''}. 

Based on content analysis, this document focuses on providing practical knowledge and detailed guidance for learners about ${topicDescription}. The content is clearly structured with main and secondary sections, including important concepts and useful information for learning.

Key highlights in the document include:
- Basic information about ${topicDescription} presented systematically and understandably
- Detailed definitions and explanations of important terms, helping readers understand the nature of the subject
- Examples and practical illustrations to support understanding and application of knowledge
- Analysis and evaluation of different aspects of the topic, providing a comprehensive perspective
- Conclusions and practical applications of knowledge, helping learners see practical value

This document is suitable for learning and research, providing a solid knowledge foundation for readers. With ${wordCount} words, the document requires approximately ${estimatedTime} minutes of reading and research to fully understand the content. Although AI service is temporarily unavailable for more detailed analysis, you can still use other features such as creating flashcards and quizzes to optimize learning from this content.

To learn effectively from this document, you should:
- Read each section carefully and note important points
- Create mind maps to connect concepts
- Practice with provided examples
- Review regularly to consolidate knowledge`
      
             parsedResponse = {
         summary: fallbackSummary,
         objectives: language === 'vi' ? [
           {
             id: 'obj_1',
             title: 'Hiểu rõ nội dung chính',
             description: 'Nắm vững các khái niệm và ý tưởng chính được trình bày trong tài liệu, bao gồm các định nghĩa quan trọng và mối quan hệ giữa các khái niệm',
             category: 'Kiến thức cơ bản',
             importance: 'high' as const,
             estimatedTime: 45,
             subObjectives: [
               'Đọc và hiểu các định nghĩa cơ bản',
               'Xác định các khái niệm chính',
               'Hiểu mối quan hệ giữa các khái niệm'
             ],
             prerequisites: ['Kiến thức nền tảng về chủ đề']
           },
           {
             id: 'obj_2', 
             title: 'Áp dụng kiến thức thực tế',
             description: 'Biết cách ứng dụng kiến thức đã học vào các tình huống thực tế và giải quyết các vấn đề liên quan',
             category: 'Ứng dụng',
             importance: 'medium' as const,
             estimatedTime: 60,
             subObjectives: [
               'Tìm hiểu các ví dụ thực tế',
               'Thực hành giải quyết vấn đề',
               'Áp dụng vào tình huống mới'
             ],
             prerequisites: ['Hiểu rõ nội dung chính']
           },
           {
             id: 'obj_3',
             title: 'Phân tích và đánh giá nội dung',
             description: 'Phân tích sâu sắc và đánh giá chất lượng thông tin từ tài liệu, xác định điểm mạnh và điểm yếu',
             category: 'Tư duy phản biện',
             importance: 'medium' as const,
             estimatedTime: 30,
             subObjectives: [
               'Phân tích logic của nội dung',
               'Đánh giá độ tin cậy',
               'Xác định điểm mạnh và yếu'
             ],
             prerequisites: ['Hiểu rõ nội dung chính', 'Áp dụng kiến thức thực tế']
           },
           {
             id: 'obj_4',
             title: 'Tích hợp kiến thức',
             description: 'Kết hợp kiến thức từ tài liệu với các kiến thức khác để tạo ra hiểu biết toàn diện',
             category: 'Tích hợp',
             importance: 'low' as const,
             estimatedTime: 40,
             subObjectives: [
               'Kết nối với kiến thức hiện có',
               'Tạo sơ đồ tư duy',
               'Tổng hợp thông tin'
             ],
             prerequisites: ['Tất cả các mục tiêu trước']
           }
         ] : [
           {
             id: 'obj_1',
             title: 'Understand Main Content',
             description: 'Master the key concepts and ideas presented in the document, including important definitions and relationships between concepts',
             category: 'Basic Knowledge',
             importance: 'high' as const,
             estimatedTime: 45,
             subObjectives: [
               'Read and understand basic definitions',
               'Identify key concepts',
               'Understand relationships between concepts'
             ],
             prerequisites: ['Basic knowledge of the topic']
           },
           {
             id: 'obj_2', 
             title: 'Apply Practical Knowledge',
             description: 'Know how to apply learned knowledge to real situations and solve related problems',
             category: 'Application',
             importance: 'medium' as const,
             estimatedTime: 60,
             subObjectives: [
               'Study real examples',
               'Practice problem solving',
               'Apply to new situations'
             ],
             prerequisites: ['Understand Main Content']
           },
           {
             id: 'obj_3',
             title: 'Analyze and Evaluate Content',
             description: 'Deeply analyze and evaluate the quality of information from the document, identify strengths and weaknesses',
             category: 'Critical Thinking',
             importance: 'medium' as const,
             estimatedTime: 30,
             subObjectives: [
               'Analyze content logic',
               'Evaluate reliability',
               'Identify strengths and weaknesses'
             ],
             prerequisites: ['Understand Main Content', 'Apply Practical Knowledge']
           },
           {
             id: 'obj_4',
             title: 'Integrate Knowledge',
             description: 'Combine knowledge from the document with other knowledge to create comprehensive understanding',
             category: 'Integration',
             importance: 'low' as const,
             estimatedTime: 40,
             subObjectives: [
               'Connect with existing knowledge',
               'Create mind maps',
               'Synthesize information'
             ],
             prerequisites: ['All previous objectives']
           }
         ],
                 keyPoints: language === 'vi' ? [
           {
             id: 'key_1',
             content: 'Tài liệu chứa thông tin quan trọng cần được nghiên cứu kỹ lưỡng và hiểu sâu về các khái niệm được trình bày',
             category: 'Khái niệm chính',
             difficulty: 'intermediate' as const,
             relatedConcepts: ['Lý thuyết', 'Thực hành', 'Ứng dụng', 'Phân tích'],
             explanation: 'Đây là điểm quan trọng nhất cần nắm vững để hiểu toàn bộ nội dung tài liệu',
             examples: [
               'Khi đọc tài liệu, hãy ghi chú các khái niệm chính',
               'Tạo sơ đồ tư duy để kết nối các khái niệm',
               'Thực hành giải thích lại bằng lời của mình'
             ],
             practiceQuestions: [
               'Bạn có thể giải thích khái niệm chính này bằng lời của mình không?',
               'Hãy tìm 3 ví dụ thực tế minh họa cho khái niệm này',
               'So sánh khái niệm này với khái niệm tương tự khác'
             ]
           },
           {
             id: 'key_2',
             content: `Với ${wordCount} từ, tài liệu yêu cầu thời gian đọc và nghiên cứu khoảng ${estimatedTime} phút để hiểu đầy đủ`,
             category: 'Thống kê',
             difficulty: 'basic' as const,
             relatedConcepts: ['Thời gian', 'Độ dài', 'Nội dung', 'Học tập'],
             explanation: 'Hiểu về độ dài và thời gian cần thiết giúp lập kế hoạch học tập hiệu quả',
             examples: [
               'Chia nhỏ thời gian học thành các phiên 25 phút',
               'Sử dụng kỹ thuật Pomodoro để tập trung',
               'Dành thời gian ôn tập sau mỗi phiên học'
             ],
             practiceQuestions: [
               'Bạn sẽ chia thời gian học như thế nào?',
               'Làm thế nào để tối ưu thời gian học tập?',
               'Bạn có thể tạo lịch học chi tiết không?'
             ]
           },
           {
             id: 'key_3',
             content: 'Tài liệu được cấu trúc logic với các phần chính và phụ, giúp người đọc dễ dàng theo dõi và hiểu nội dung',
             category: 'Cấu trúc',
             difficulty: 'basic' as const,
             relatedConcepts: ['Tổ chức', 'Logic', 'Hiểu biết', 'Học tập'],
             explanation: 'Cấu trúc logic giúp người đọc dễ dàng theo dõi và hiểu nội dung một cách có hệ thống',
             examples: [
               'Đọc phần mục lục trước khi bắt đầu',
               'Tạo outline cho từng chương',
               'Sử dụng mind map để tổ chức thông tin'
             ],
             practiceQuestions: [
               'Bạn có thể vẽ sơ đồ cấu trúc tài liệu không?',
               'Hãy tóm tắt cấu trúc chính của tài liệu',
               'Làm thế nào để cải thiện cấu trúc này?'
             ]
           }
         ] : [
           {
             id: 'key_1',
             content: 'The document contains important information that needs to be thoroughly researched and deeply understood about the presented concepts',
             category: 'Main Concepts',
             difficulty: 'intermediate' as const,
             relatedConcepts: ['Theory', 'Practice', 'Application', 'Analysis'],
             explanation: 'This is the most important point to master in order to understand the entire document content',
             examples: [
               'When reading the document, take notes on key concepts',
               'Create mind maps to connect concepts',
               'Practice explaining in your own words'
             ],
             practiceQuestions: [
               'Can you explain this key concept in your own words?',
               'Find 3 real-world examples that illustrate this concept',
               'Compare this concept with a similar one'
             ]
           },
           {
             id: 'key_2',
             content: `With ${wordCount} words, the document requires approximately ${estimatedTime} minutes of reading and research to fully understand`,
             category: 'Statistics',
             difficulty: 'basic' as const,
             relatedConcepts: ['Time', 'Length', 'Content', 'Learning'],
             explanation: 'Understanding length and required time helps plan effective study sessions',
             examples: [
               'Break study time into 25-minute sessions',
               'Use Pomodoro technique for focus',
               'Allocate review time after each session'
             ],
             practiceQuestions: [
               'How would you divide your study time?',
               'How can you optimize your study time?',
               'Can you create a detailed study schedule?'
             ]
           },
           {
             id: 'key_3',
             content: 'The document is logically structured with main and secondary sections, helping readers easily follow and understand the content',
             category: 'Structure',
             difficulty: 'basic' as const,
             relatedConcepts: ['Organization', 'Logic', 'Understanding', 'Learning'],
             explanation: 'Logical structure helps readers easily follow and understand content systematically',
             examples: [
               'Read the table of contents before starting',
               'Create outlines for each chapter',
               'Use mind maps to organize information'
             ],
             practiceQuestions: [
               'Can you draw a diagram of the document structure?',
               'Summarize the main structure of the document',
               'How can this structure be improved?'
             ]
           }
         ],
                 insights: {
           difficulty: (wordCount > 2000 ? 'hard' : wordCount > 800 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
          estimatedReadTime: estimatedTime,
          keyConcepts: keywords.slice(0, 8),
                     recommendations: language === 'vi' ? [
             `Đọc kỹ tài liệu ${wordCount} từ này với thời gian ${estimatedTime} phút để nắm vững nội dung chính`, 
             'Ghi chú các điểm quan trọng và khái niệm chính vào sổ tay học tập',
             'Tạo flashcard để ôn tập các khái niệm quan trọng mỗi ngày',
             'Làm quiz để kiểm tra mức độ hiểu biết và xác định điểm yếu',
             'Ôn tập định kỳ mỗi tuần để ghi nhớ lâu dài và củng cố kiến thức',
             'Áp dụng kiến thức vào thực tế thông qua các bài tập và dự án thực hành'
           ] : [
             `Read this ${wordCount}-word document carefully with ${estimatedTime} minutes to master the main content`, 
             'Note important points and key concepts in your study notebook',
             'Create flashcards to review important concepts daily',
             'Take quizzes to test understanding and identify weaknesses',
             'Review regularly each week for long-term retention and knowledge consolidation',
             'Apply knowledge to practice through exercises and practical projects'
           ],
                     strengths: language === 'vi' ? [
             'Nội dung được trích xuất thành công và đầy đủ với cấu trúc rõ ràng', 
             'Có thể tạo flashcard và quiz để hỗ trợ học tập hiệu quả',
             'Hệ thống fallback hoạt động ổn định và đáng tin cậy',
             'Tài liệu có cấu trúc logic và dễ hiểu cho người học',
             'Phù hợp cho nhiều đối tượng học viên khác nhau'
           ] : [
             'Content successfully extracted and complete with clear structure', 
             'Can create flashcards and quizzes to support effective learning',
             'Fallback system operates stably and reliably',
             'Document has logical structure and is easy to understand for learners',
             'Suitable for various types of learners'
           ],
                     improvements: language === 'vi' ? [
             'AI service sẽ khả dụng sau để phân tích chi tiết và chuyên sâu hơn',
             'Có thể bổ sung thêm ví dụ và minh họa trực quan',
             'Tích hợp thêm các nguồn tham khảo và tài liệu liên quan',
             'Bổ sung bài tập thực hành và case study cụ thể',
             'Tăng cường tính tương tác và phản hồi tức thì'
           ] : [
             'AI service will be available later for more detailed and in-depth analysis',
             'Can add more examples and visual illustrations',
             'Integrate additional reference sources and related materials',
             'Add practical exercises and specific case studies',
             'Enhance interactivity and immediate feedback'
           ],
          learningPath: {
            beginner: [
              'Bước 1: Đọc hiểu khái niệm cơ bản và thuật ngữ chính',
              'Bước 2: Làm quen với cấu trúc và tổ chức nội dung',
              'Bước 3: Thực hành với ví dụ đơn giản và bài tập cơ bản'
            ],
            intermediate: [
              'Bước 1: Phân tích sâu các khái niệm và mối quan hệ',
              'Bước 2: Áp dụng kiến thức vào tình huống thực tế',
              'Bước 3: So sánh và đối chiếu các phương pháp khác nhau'
            ],
            advanced: [
              'Bước 1: Nghiên cứu chuyên sâu và mở rộng kiến thức',
              'Bước 2: Phát triển ứng dụng mới và sáng tạo',
              'Bước 3: Đánh giá, cải tiến và chia sẻ kiến thức'
            ]
          },
          assessment: {
            knowledgeCheck: [
              'Bạn có thể giải thích các khái niệm chính trong tài liệu không?',
              'Bạn có thể áp dụng kiến thức vào tình huống thực tế không?',
              'Bạn có thể so sánh và đối chiếu các phương pháp khác nhau không?'
            ],
            practicalTasks: [
              'Tạo một bản tóm tắt cá nhân về nội dung chính với ví dụ cụ thể',
              'Thực hiện một dự án nhỏ áp dụng kiến thức đã học',
              'Thiết kế một bài thuyết trình chia sẻ kiến thức với người khác'
            ],
            criticalThinking: [
              'Phân tích ưu nhược điểm của các phương pháp được đề cập',
              'Đề xuất cải tiến hoặc phát triển mới dựa trên kiến thức đã học',
              'Đánh giá tính ứng dụng và hiệu quả trong bối cảnh thực tế'
            ]
          },
          resources: {
            additionalReading: [
              'Sách giáo khoa chuyên ngành với các chương liên quan',
              'Bài báo khoa học và nghiên cứu mới nhất trong lĩnh vực',
              'Tài liệu tham khảo và hướng dẫn thực hành chi tiết'
            ],
            tools: [
              'Phần mềm phân tích và trực quan hóa dữ liệu',
              'Công cụ tạo mindmap và sơ đồ tư duy',
              'Ứng dụng ghi chú và quản lý kiến thức cá nhân'
            ],
            communities: [
              'Diễn đàn học tập trực tuyến và nhóm thảo luận',
              'Cộng đồng chuyên gia và người làm việc trong lĩnh vực',
              'Khóa học trực tuyến và workshop thực hành'
            ]
          }
        }
      }
    }

    // Validate và normalize response
    const normalizedResponse: SummaryResponse = {
      summary: parsedResponse.summary || 'Không thể tạo tóm tắt',
      objectives: (parsedResponse.objectives || []).map((obj, idx) => ({
        id: obj.id || `obj_${idx + 1}`,
        title: obj.title || 'Mục tiêu học tập',
        description: obj.description || 'Mô tả mục tiêu',
        category: obj.category || 'Tổng quan',
        importance: (['high', 'medium', 'low'] as const).includes(obj.importance) ? obj.importance : 'medium',
        estimatedTime: obj.estimatedTime || 30,
        subObjectives: Array.isArray(obj.subObjectives) ? obj.subObjectives : ['Hiểu rõ các khái niệm cơ bản trong tài liệu', 'Áp dụng kiến thức vào tình huống thực tế', 'Đánh giá và phân tích thông tin'],
        prerequisites: Array.isArray(obj.prerequisites) ? obj.prerequisites : ['Kiến thức nền tảng về chủ đề', 'Kỹ năng đọc hiểu và phân tích']
      })),
      keyPoints: (parsedResponse.keyPoints || []).map((point, idx) => ({
        id: point.id || `key_${idx + 1}`,
        content: point.content || 'Điểm chính',
        category: point.category || 'Tổng quan',
        difficulty: (['basic', 'intermediate', 'advanced'] as const).includes(point.difficulty) ? point.difficulty : 'intermediate',
        relatedConcepts: Array.isArray(point.relatedConcepts) ? point.relatedConcepts : [],
        explanation: point.explanation || 'Giải thích chi tiết về điểm này',
        examples: Array.isArray(point.examples) ? point.examples : ['Ví dụ thực tế về ứng dụng kiến thức', 'Ví dụ minh họa các khái niệm chính', 'Ví dụ về tình huống thực tế'],
        practiceQuestions: Array.isArray(point.practiceQuestions) ? point.practiceQuestions : ['Làm thế nào để áp dụng kiến thức này vào thực tế?', 'Bạn có thể giải thích khái niệm này cho người khác không?', 'Điều gì sẽ xảy ra nếu thay đổi một yếu tố trong tình huống này?']
      })),
      insights: {
        difficulty: (['easy', 'medium', 'hard'] as const).includes(parsedResponse.insights?.difficulty) ? parsedResponse.insights.difficulty : 'medium',
        estimatedReadTime: parsedResponse.insights?.estimatedReadTime || 10,
        keyConcepts: Array.isArray(parsedResponse.insights?.keyConcepts) ? parsedResponse.insights.keyConcepts : [],
        recommendations: Array.isArray(parsedResponse.insights?.recommendations) ? parsedResponse.insights.recommendations : [],
        strengths: Array.isArray(parsedResponse.insights?.strengths) ? parsedResponse.insights.strengths : [],
        improvements: Array.isArray(parsedResponse.insights?.improvements) ? parsedResponse.insights.improvements : [],
        learningPath: parsedResponse.insights?.learningPath || {
          beginner: ['Bước 1: Đọc hiểu khái niệm cơ bản', 'Bước 2: Làm quen với thuật ngữ chính', 'Bước 3: Thực hành với ví dụ đơn giản'],
          intermediate: ['Bước 1: Phân tích sâu các khái niệm', 'Bước 2: Áp dụng vào tình huống thực tế', 'Bước 3: So sánh và đối chiếu các phương pháp'],
          advanced: ['Bước 1: Nghiên cứu chuyên sâu', 'Bước 2: Phát triển ứng dụng mới', 'Bước 3: Đánh giá và cải tiến']
        },
        assessment: parsedResponse.insights?.assessment || {
          knowledgeCheck: ['Bạn có thể giải thích các khái niệm chính không?', 'Bạn có thể áp dụng kiến thức vào thực tế không?', 'Bạn có thể so sánh các phương pháp khác nhau không?'],
          practicalTasks: ['Tạo bản tóm tắt cá nhân', 'Thực hiện dự án nhỏ', 'Thiết kế bài thuyết trình'],
          criticalThinking: ['Phân tích ưu nhược điểm', 'Đề xuất cải tiến', 'Đánh giá tính ứng dụng']
        },
        resources: parsedResponse.insights?.resources || {
          additionalReading: ['Sách giáo khoa chuyên ngành', 'Bài báo khoa học mới nhất', 'Tài liệu tham khảo chi tiết'],
          tools: ['Phần mềm phân tích dữ liệu', 'Công cụ tạo mindmap', 'Ứng dụng ghi chú'],
          communities: ['Diễn đàn học tập trực tuyến', 'Cộng đồng chuyên gia', 'Khóa học trực tuyến']
        }
      }
    }

    console.log('Successfully generated summary for level:', level)
    console.log('Final summary length:', normalizedResponse.summary.length)
    return NextResponse.json(normalizedResponse)

  } catch (error) {
    console.error('Generate summary error:', error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

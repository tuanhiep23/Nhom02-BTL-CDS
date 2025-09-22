import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

type GenerateFlashcardsRequest = {
  text: string
  numCards?: number
  language?: string
}

type GeneratedFlashcard = {
  id: string
  question: string
  answer: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
}

export async function POST(req: NextRequest) {
  try {
    // Lấy ngôn ngữ từ Accept-Language header
    const acceptLanguage = req.headers.get('accept-language') || 'vi'
    const body = (await req.json()) as GenerateFlashcardsRequest
    const { text, numCards = 9 } = body
    const language = acceptLanguage.startsWith('en') ? 'en' : 'vi'
    
    console.log('Flashcards request language:', language)
    console.log('Accept-Language header:', acceptLanguage)

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY on server' },
        { status: 500 }
      )
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Text content is required and should be at least 20 characters.' },
        { status: 400 }
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!
    })

    const prompt = `Bạn là một trợ lý tạo flashcard học tập thông minh.

Nhiệm vụ:
- Tạo ${numCards} flashcard chất lượng cao từ nội dung sau.
- NGÔN NGỮ YÊU CẦU: ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- Trả về CHÍNH XÁC dạng JSON thuần (không kèm giải thích), theo schema: [{ id, question, answer, category, difficulty, tags }].

⚠️ QUAN TRỌNG VỀ NGÔN NGỮ:
- TẤT CẢ nội dung (question, answer, category, tags) PHẢI bằng ${language === 'vi' ? 'Tiếng Việt' : 'English'}
- KHÔNG được trộn lẫn ngôn ngữ
- Nếu language='en' thì TẤT CẢ phải bằng English
- Nếu language='vi' thì TẤT CẢ phải bằng Tiếng Việt
- Quy tắc:
  * Câu hỏi ngắn gọn, rõ ràng, tập trung 1 ý.
  * Trả lời súc tích (2-5 câu hoặc gạch đầu dòng).
  * Phân loại category theo chương/mục phù hợp.
  * difficulty thuộc một trong: "easy" | "medium" | "hard".
  * tags là mảng 2-5 từ khóa.

Nội dung nguồn:
"""
${text.substring(0, 3000)}
"""

Trả về JSON array duy nhất, không có text khác:`

    // Retry logic với fallback
    let raw = ''
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Flashcard generation attempt ${retryCount + 1}/${maxRetries}`)
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.4,
          max_tokens: 1500
        })
        
        raw = chatCompletion.choices[0]?.message?.content || ''
        break
        
      } catch (apiError: any) {
        retryCount++
        console.error(`Flashcard API failed (attempt ${retryCount}):`, apiError.message)
        
        if (retryCount >= maxRetries) {
          console.log('Max retries reached for flashcards')
                     // Return fallback flashcards
           const fallbackCards = language === 'vi' ? [
             {
               id: '1',
               question: 'Câu hỏi từ nội dung đã tải lên',
               answer: 'Câu trả lời tương ứng với nội dung',
               category: 'Tổng quan',
               difficulty: 'medium',
               tags: ['học tập', 'kiến thức']
             },
             {
               id: '2', 
               question: 'Khái niệm chính trong tài liệu?',
               answer: 'Khái niệm quan trọng được trình bày',
               category: 'Khái niệm',
               difficulty: 'medium',
               tags: ['khái niệm', 'cơ bản']
             }
           ] : [
             {
               id: '1',
               question: 'Question from uploaded content',
               answer: 'Answer corresponding to the content',
               category: 'Overview',
               difficulty: 'medium',
               tags: ['learning', 'knowledge']
             },
             {
               id: '2', 
               question: 'Main concept in the document?',
               answer: 'Important concept presented',
               category: 'Concepts',
               difficulty: 'medium',
               tags: ['concepts', 'basic']
             }
           ]
          return NextResponse.json({ flashcards: fallbackCards })
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }

    // Attempt to extract JSON from potential code fences
    let jsonString = raw
      .replace(/^```json\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    // Loại bỏ các ký tự control không hợp lệ trong JSON
    jsonString = jsonString.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    
    // Thay thế các ký tự newline và tab trong string values
    jsonString = jsonString.replace(/\n/g, '\\n').replace(/\t/g, '\\t')

    let parsed: GeneratedFlashcard[]
    try {
      parsed = JSON.parse(jsonString)
    } catch (err) {
      // Fallback: try to locate JSON array substring
      const match = jsonString.match(/\[[\s\S]*\]/)
      if (!match) throw err
      parsed = JSON.parse(match[0])
    }

         // Normalize and ensure required fields
     const normalized: GeneratedFlashcard[] = parsed.slice(0, numCards).map((c, idx) => ({
       id: c.id || `${Date.now()}_${idx + 1}`,
       question: c.question?.toString().trim() || (language === 'vi' ? 'Câu hỏi?' : 'Question?'),
       answer: c.answer?.toString().trim() || (language === 'vi' ? 'Trả lời.' : 'Answer.'),
       category: c.category?.toString().trim() || (language === 'vi' ? 'Tổng quan' : 'Overview'),
      difficulty: (['easy', 'medium', 'hard'] as const).includes(
        (c.difficulty as any) ?? 'medium'
      )
        ? (c.difficulty as any)
        : 'medium',
      tags: Array.isArray(c.tags) ? c.tags.map(String).slice(0, 6) : []
    }))

    return NextResponse.json({ flashcards: normalized })
  } catch (error: any) {
    console.error('generate-flashcards error', error)
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}



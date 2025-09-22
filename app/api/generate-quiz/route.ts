import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

type GenerateQuizRequest = {
  text: string
  numQuestions?: number
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  language?: string
}

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

type GenerateQuizResponse = {
  questions: QuizQuestion[]
}

export async function POST(req: NextRequest) {
  try {
    // Lấy ngôn ngữ từ Accept-Language header
    const acceptLanguage = req.headers.get('accept-language') || 'vi'
    const xLocale = req.headers.get('x-locale') || acceptLanguage
    const body = (await req.json()) as GenerateQuizRequest
    const { text, numQuestions = 12, difficulty = 'mixed' } = body
    const language = (acceptLanguage.startsWith('en') || xLocale === 'en') ? 'en' : 'vi'
    
    console.log('Accept-Language header:', acceptLanguage)
    console.log('Detected language:', language)

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY on server' },
        { status: 500 }
      )
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text content is required and should be at least 50 characters.' },
        { status: 400 }
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!
    })

    const prompt = `You are an expert educator and test designer. Create ${numQuestions} high-quality multiple choice questions from the following content.

DETAILED REQUIREMENTS:
- LANGUAGE: ${language === 'vi' ? 'VIETNAMESE (Tiếng Việt)' : 'ENGLISH ONLY'}
- Create exactly ${numQuestions} questions (no less)
- Questions must be diverse: concepts, definitions, applications, analysis, comparisons
- 4 options A, B, C, D for each question
- Only 1 correct answer, 3 plausible wrong answers
- Detailed explanation of why the answer is correct and why others are wrong
- Difficulty distribution: 40% easy, 40% medium, 20% hard
- Categorize by specific topic/chapter
- Questions must test deep understanding, not just memorization

QUESTION TYPES TO CREATE:
1. Concept and definition questions
2. Real-world application questions
3. Comparison and analysis questions
4. Process and method questions
5. Pros and cons questions
6. Example illustration questions

IMPORTANT: ${language === 'vi' ? 'ALL QUESTIONS, OPTIONS, EXPLANATIONS, AND CATEGORIES MUST BE IN VIETNAMESE' : 'ALL QUESTIONS, OPTIONS, EXPLANATIONS, AND CATEGORIES MUST BE IN ENGLISH'}

Return JSON with format:
{
  "questions": [
    {
      "id": "q_1",
      "question": "${language === 'vi' ? 'Câu hỏi trắc nghiệm?' : 'Multiple choice question?'}",
      "options": ["A. ${language === 'vi' ? 'Lựa chọn A' : 'Option A'}", "B. ${language === 'vi' ? 'Lựa chọn B' : 'Option B'}", "C. ${language === 'vi' ? 'Lựa chọn C' : 'Option C'}", "D. ${language === 'vi' ? 'Lựa chọn D' : 'Option D'}"],
      "correctAnswer": 0,
      "explanation": "${language === 'vi' ? 'Giải thích chi tiết tại sao đáp án này đúng và tại sao các đáp án khác sai' : 'Detailed explanation of why this answer is correct and why others are wrong'}",
      "difficulty": "easy|medium|hard",
      "category": "${language === 'vi' ? 'Tên chủ đề/chương cụ thể' : 'Specific topic/chapter name'}"
    }
  ]
}

Content: """
${text.substring(0, 6000)}
"""

Return only JSON, no other text:`

    // Retry logic với fallback
    let aiResponse = ''
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Quiz generation attempt ${retryCount + 1}/${maxRetries}`)
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.3,
          max_tokens: 6000
        })
        
        aiResponse = chatCompletion.choices[0]?.message?.content || ''
        console.log('AI response received, length:', aiResponse.length)
        console.log('AI response preview:', aiResponse.substring(0, 200))
        break
        
      } catch (apiError: any) {
        retryCount++
        console.error(`Quiz API failed (attempt ${retryCount}):`, apiError.message)
        
        if (retryCount >= maxRetries) {
          console.log('Max retries reached for quiz, using fallback')
          break
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }

    // Parse AI response
    let parsedResponse: GenerateQuizResponse
    
    if (!aiResponse || aiResponse.trim() === '') {
      console.log('AI response is empty, using fallback quiz for language:', language)
      
             // Fallback questions based on language
       const fallbackQuestions: QuizQuestion[] = language === 'vi' ? [
         {
           id: 'q_1',
           question: 'Nội dung tài liệu chủ yếu đề cập đến chủ đề gì?',
           options: [
             'A. Công nghệ thông tin',
             'B. Kinh tế chính trị',
             'C. Văn học nghệ thuật', 
             'D. Y học sinh học'
           ],
           correctAnswer: 1,
           explanation: 'Tài liệu tập trung vào các khái niệm và nguyên lý của kinh tế chính trị. Các lựa chọn khác không phù hợp với nội dung chính của tài liệu.',
           difficulty: 'easy' as const,
           category: 'Tổng quan'
         },
         {
           id: 'q_2',
           question: 'Phương pháp học tập nào được khuyến nghị để hiểu sâu nội dung?',
           options: [
             'A. Học thuộc lòng',
             'B. Đọc hiểu và phân tích',
             'C. Chỉ xem qua một lần',
             'D. Bỏ qua phần khó'
           ],
           correctAnswer: 1,
           explanation: 'Đọc hiểu và phân tích giúp nắm vững bản chất của các khái niệm. Học thuộc lòng không giúp hiểu sâu, còn xem qua hoặc bỏ qua sẽ không hiệu quả.',
           difficulty: 'medium' as const,
           category: 'Phương pháp học tập'
         },
         {
           id: 'q_3',
           question: 'Tại sao cần tạo flashcard khi học tập?',
           options: [
             'A. Để trang trí',
             'B. Để ôn tập nhanh và hiệu quả',
             'C. Để tốn thời gian',
             'D. Để gây rối'
           ],
           correctAnswer: 1,
           explanation: 'Flashcard giúp ôn tập nhanh và hiệu quả thông qua phương pháp spaced repetition. Các lựa chọn khác không đúng mục đích của flashcard.',
           difficulty: 'easy' as const,
           category: 'Công cụ học tập'
         },
         {
           id: 'q_4',
           question: 'Làm thế nào để ghi nhớ kiến thức lâu dài?',
           options: [
             'A. Chỉ đọc một lần',
             'B. Ôn tập định kỳ',
             'C. Bỏ qua phần khó',
             'D. Chỉ học khi có bài kiểm tra'
           ],
           correctAnswer: 1,
           explanation: 'Ôn tập định kỳ giúp củng cố kiến thức và ghi nhớ lâu dài. Các phương pháp khác không hiệu quả cho việc ghi nhớ bền vững.',
           difficulty: 'medium' as const,
           category: 'Kỹ năng học tập'
         },
         {
           id: 'q_5',
           question: 'Điều gì quan trọng nhất khi học một khái niệm mới?',
           options: [
             'A. Học thuộc định nghĩa',
             'B. Hiểu bản chất và ứng dụng',
             'C. Chỉ nhớ tên khái niệm',
             'D. Bỏ qua nếu khó hiểu'
           ],
           correctAnswer: 1,
           explanation: 'Hiểu bản chất và ứng dụng giúp nắm vững khái niệm thay vì chỉ ghi nhớ bề ngoài. Điều này giúp áp dụng kiến thức vào thực tế.',
           difficulty: 'hard' as const,
           category: 'Tư duy học tập'
         },
         {
           id: 'q_6',
           question: 'Khi gặp nội dung khó hiểu, nên làm gì?',
           options: [
             'A. Bỏ qua luôn',
             'B. Đọc lại nhiều lần và tìm hiểu thêm',
             'C. Chỉ đọc qua một lần',
             'D. Chờ người khác giải thích'
           ],
           correctAnswer: 1,
           explanation: 'Đọc lại nhiều lần và tìm hiểu thêm giúp hiểu sâu vấn đề. Bỏ qua hoặc chỉ đọc qua sẽ không giải quyết được vấn đề.',
           difficulty: 'medium' as const,
           category: 'Kỹ năng giải quyết vấn đề'
         }
       ] : [
         {
           id: 'q_1',
           question: 'What is the main topic covered in the document?',
           options: [
             'A. Information Technology',
             'B. Economics and Politics',
             'C. Literature and Arts', 
             'D. Medicine and Biology'
           ],
           correctAnswer: 1,
           explanation: 'The document focuses on concepts and principles of economics and politics. Other options are not relevant to the main content.',
           difficulty: 'easy' as const,
           category: 'Overview'
         },
         {
           id: 'q_2',
           question: 'Which learning method is recommended for deep understanding?',
           options: [
             'A. Memorization',
             'B. Reading and analysis',
             'C. Just skim through once',
             'D. Skip difficult parts'
           ],
           correctAnswer: 1,
           explanation: 'Reading and analysis helps understand the essence of concepts. Memorization doesn\'t help deep understanding, while skimming or skipping is ineffective.',
           difficulty: 'medium' as const,
           category: 'Learning Methods'
         },
         {
           id: 'q_3',
           question: 'Why create flashcards when studying?',
           options: [
             'A. For decoration',
             'B. For quick and effective review',
             'C. To waste time',
             'D. To cause confusion'
           ],
           correctAnswer: 1,
           explanation: 'Flashcards help with quick and effective review through spaced repetition. Other options are not the purpose of flashcards.',
           difficulty: 'easy' as const,
           category: 'Study Tools'
         },
         {
           id: 'q_4',
           question: 'How to remember knowledge for a long time?',
           options: [
             'A. Read only once',
             'B. Regular review',
             'C. Skip difficult parts',
             'D. Only study before exams'
           ],
           correctAnswer: 1,
           explanation: 'Regular review helps consolidate knowledge and remember long-term. Other methods are not effective for sustainable memory.',
           difficulty: 'medium' as const,
           category: 'Study Skills'
         },
         {
           id: 'q_5',
           question: 'What is most important when learning a new concept?',
           options: [
             'A. Memorize the definition',
             'B. Understand the essence and application',
             'C. Only remember the concept name',
             'D. Skip if difficult to understand'
           ],
           correctAnswer: 1,
           explanation: 'Understanding the essence and application helps master the concept instead of just surface memorization. This helps apply knowledge in practice.',
           difficulty: 'hard' as const,
           category: 'Learning Thinking'
         },
         {
           id: 'q_6',
           question: 'When encountering difficult content, what should you do?',
           options: [
             'A. Skip it entirely',
             'B. Read multiple times and research further',
             'C. Just read through once',
             'D. Wait for others to explain'
           ],
           correctAnswer: 1,
           explanation: 'Reading multiple times and researching further helps understand the issue deeply. Skipping or just reading through won\'t solve the problem.',
           difficulty: 'medium' as const,
           category: 'Problem Solving'
         }
       ]
      
      parsedResponse = {
        questions: fallbackQuestions
      }
    } else {
             try {
         const cleanJson = aiResponse
           .replace(/^```json\n?/i, '')
           .replace(/\n?```$/i, '')
           .replace(/^[^{]*/, '')
           .replace(/[^}]*$/, '')
           .trim()
         
         if (!cleanJson.startsWith('{')) {
           throw new Error('Response is not JSON format')
         }
         
         // Fix incomplete JSON responses
         let fixedJson = cleanJson
         
         // If JSON is incomplete, try to complete it
         if (!fixedJson.endsWith('}')) {
           // Find the last complete question
           const lastCompleteQuestion = fixedJson.lastIndexOf('},')
           if (lastCompleteQuestion > 0) {
             fixedJson = fixedJson.substring(0, lastCompleteQuestion + 1) + ']}'
           } else {
             // If no complete questions, use fallback
             throw new Error('No complete questions found')
           }
         }
         
                   parsedResponse = JSON.parse(fixedJson)
          console.log('Successfully parsed AI response, questions count:', parsedResponse.questions?.length)
          console.log('First question language check:', parsedResponse.questions?.[0]?.question?.substring(0, 50))
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        console.error('Raw AI response:', aiResponse.substring(0, 500))
        
        // Fallback quiz based on language
        const fallbackQuiz = language === 'vi' ? {
          questions: [
            {
              id: 'q_1',
              question: 'Tài liệu này thuộc lĩnh vực nào?',
              options: [
                'A. Khoa học tự nhiên',
                'B. Khoa học xã hội', 
                'C. Công nghệ',
                'D. Nghệ thuật'
              ],
              correctAnswer: 1,
              explanation: 'Tài liệu thuộc lĩnh vực khoa học xã hội, cụ thể là kinh tế chính trị.',
              difficulty: 'easy' as const,
              category: 'Phân loại'
            }
          ]
        } : {
          questions: [
            {
              id: 'q_1',
              question: 'What field does this document belong to?',
              options: [
                'A. Natural Sciences',
                'B. Social Sciences', 
                'C. Technology',
                'D. Arts'
              ],
              correctAnswer: 1,
              explanation: 'The document belongs to the field of social sciences, specifically economics and politics.',
              difficulty: 'easy' as const,
              category: 'Classification'
            }
          ]
        }
        
        parsedResponse = fallbackQuiz
      }
    }

    // Validate và normalize response
    const normalizedResponse: GenerateQuizResponse = {
      questions: (parsedResponse.questions || []).map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        question: q.question || (language === 'vi' ? 'Câu hỏi mẫu' : 'Sample question'),
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : language === 'vi' ? [
          'A. Lựa chọn A',
          'B. Lựa chọn B', 
          'C. Lựa chọn C',
          'D. Lựa chọn D'
        ] : [
          'A. Option A',
          'B. Option B', 
          'C. Option C',
          'D. Option D'
        ],
        correctAnswer: (q.correctAnswer >= 0 && q.correctAnswer <= 3) ? q.correctAnswer : 0,
        explanation: q.explanation || (language === 'vi' ? 'Giải thích đáp án' : 'Answer explanation'),
        difficulty: (['easy', 'medium', 'hard'] as const).includes(q.difficulty) ? q.difficulty : 'medium',
        category: q.category || (language === 'vi' ? 'Tổng quan' : 'Overview')
      }))
    }

    console.log('Successfully generated quiz with', normalizedResponse.questions.length, 'questions')
    console.log('Final language used:', language)
    console.log('Sample question:', normalizedResponse.questions[0]?.question?.substring(0, 50))
    return NextResponse.json(normalizedResponse)

  } catch (error) {
    console.error('Generate quiz error:', error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

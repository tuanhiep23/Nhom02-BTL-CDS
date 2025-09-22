import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

type ProcessFileRequest = {
  file: File
  type: string
}

type ProcessedFileResponse = {
  id: string
  filename: string
  type: string
  size: number
  content: string
  extractedText: string
  summary?: string
  metadata: {
    pages?: number
    wordCount: number
    language: string
    topics: string[]
    confidence: number
  }
  aiInsights: {
    difficulty: 'easy' | 'medium' | 'hard'
    estimatedReadTime: number
    keyConcepts: string[]
    recommendations: string[]
  }
}

export async function POST(req: NextRequest) {
  try {
    // Lấy ngôn ngữ từ Accept-Language header hoặc default là 'vi'
    const acceptLanguage = req.headers.get('accept-language') || 'vi'
    const locale = acceptLanguage.startsWith('en') ? 'en' : 'vi'
    
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY on server' },
        { status: 500 }
      )
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size)

    // Trích xuất text từ file
    let extractedText = ''
    let pages = 1

    try {
      if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
        // Xử lý PDF với pdf-parse (cách khác)
        try {
          console.log('Starting PDF processing with pdf-parse...')
          
          const buffer = Buffer.from(await file.arrayBuffer())
          console.log('PDF buffer created, size:', buffer.length)
          
          // Import pdf-parse với require thay vì import
          const pdfParse = require('pdf-parse')
          
          // Parse PDF với buffer trực tiếp
          const data = await pdfParse(buffer, {
            max: 50
          })
          
          extractedText = data.text
          pages = data.numpages || 1
          
          console.log(`PDF parsed successfully: ${pages} pages, ${extractedText.length} characters`)
          
          // Clean up extracted text
          extractedText = extractedText
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim()
          
          if (!extractedText || extractedText.length < 50) {
            throw new Error('PDF không chứa text có thể đọc được hoặc là file scan. Vui lòng thử PDF khác có text hoặc file DOCX.')
          }
          
        } catch (pdfError: any) {
          console.error('PDF processing error:', pdfError)
          throw new Error(`Không thể xử lý file PDF: ${pdfError.message}. Vui lòng thử file DOCX hoặc TXT.`)
        }
        
      } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        // Xử lý Word
        try {
          const mammoth = (await import('mammoth')).default
          const buffer = Buffer.from(await file.arrayBuffer())
          const result = await mammoth.extractRawText({ buffer })
          extractedText = result.value
        } catch (wordError) {
          throw new Error('Không thể xử lý file Word. Vui lòng thử file khác.')
        }
        
      } else if (file.type.includes('text') || file.name.toLowerCase().endsWith('.txt')) {
        // Xử lý text file
        extractedText = await file.text()
        
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
          { status: 400 }
        )
      }

      if (!extractedText || extractedText.trim().length < 50) {
        return NextResponse.json(
          { error: 'Could not extract meaningful text from the file. Please check if the file contains readable text.' },
          { status: 400 }
        )
      }

      console.log('Extracted text length:', extractedText.length)

      
          const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY!
          })
    


      const analysisPrompt = `Bạn là một chuyên gia phân tích tài liệu học thuật. Hãy phân tích nội dung sau và trả về JSON với định dạng chính xác.

NGÔN NGỮ YÊU CẦU: ${locale === 'vi' ? 'Tiếng Việt' : 'English'}

{
  "topics": ["${locale === 'vi' ? 'chủ đề 1' : 'topic 1'}", "${locale === 'vi' ? 'chủ đề 2' : 'topic 2'}", "${locale === 'vi' ? 'chủ đề 3' : 'topic 3'}"],
  "difficulty": "easy|medium|hard",
  "keyConcepts": ["${locale === 'vi' ? 'khái niệm 1' : 'concept 1'}", "${locale === 'vi' ? 'khái niệm 2' : 'concept 2'}", "${locale === 'vi' ? 'khái niệm 3' : 'concept 3'}"],
  "recommendations": ["${locale === 'vi' ? 'gợi ý học tập 1' : 'learning suggestion 1'}", "${locale === 'vi' ? 'gợi ý 2' : 'suggestion 2'}", "${locale === 'vi' ? 'gợi ý 3' : 'suggestion 3'}"],
  "estimatedReadTime": số_phút_đọc,
  "language": "${locale}"
}

Nội dung cần phân tích:
"""
${extractedText.substring(0, 8000)}
"""

Trả về chỉ JSON, không có text khác:`

      // Retry logic cho API calls
      let aiAnalysis = ''
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          console.log(`AI analysis attempt ${retryCount + 1}/${maxRetries}`)
          
                  const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.2,
          max_tokens: 1024
        })
        
        aiAnalysis = chatCompletion.choices[0]?.message?.content || ''
          break // Success, exit retry loop
          
        } catch (apiError: any) {
          retryCount++
          console.error(`API call failed (attempt ${retryCount}):`, apiError.message)
          
          if (retryCount >= maxRetries) {
            console.log('Max retries reached, using fallback analysis')
            break
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }

      console.log('AI analysis response:', aiAnalysis)

      // Parse AI response
      let parsedAnalysis
      try {
        if (!aiAnalysis || aiAnalysis.trim() === '') {
          throw new Error('Empty AI analysis response')
        }
        
        const cleanJson = aiAnalysis
          .replace(/^```json\n?/i, '')
          .replace(/\n?```$/i, '')
          .replace(/^[^{]*/, '') // Remove any text before first {
          .replace(/[^}]*$/, '') // Remove any text after last }
          .trim()
        
        if (!cleanJson.startsWith('{')) {
          throw new Error('Analysis response is not JSON format')
        }
        
        parsedAnalysis = JSON.parse(cleanJson)
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        console.error('Raw AI analysis:', aiAnalysis.substring(0, 500))
        // Fallback analysis
        parsedAnalysis = {
          topics: locale === 'vi' 
            ? ['Chủ đề chính', 'Kiến thức cơ bản', 'Ứng dụng thực tế']
            : ['Main Topic', 'Basic Knowledge', 'Practical Application'],
          difficulty: 'medium',
          keyConcepts: locale === 'vi'
            ? ['Khái niệm A', 'Khái niệm B', 'Khái niệm C']
            : ['Concept A', 'Concept B', 'Concept C'],
          recommendations: locale === 'vi'
            ? ['Đọc kỹ nội dung', 'Làm bài tập', 'Ôn tập định kỳ']
            : ['Read content carefully', 'Do exercises', 'Review regularly'],
          estimatedReadTime: Math.max(5, Math.round(extractedText.length / 200)),
          language: locale
        }
      }

      // Tạo response data
      const processedData: ProcessedFileResponse = {
        id: Date.now().toString(),
        filename: file.name,
        type: file.type,
        size: file.size,
        content: extractedText,
        extractedText: extractedText,
        summary: '', // Summary sẽ được tạo bởi component riêng
        metadata: {
          pages,
          wordCount: extractedText.split(/\s+/).length,
          language: parsedAnalysis.language || 'vi',
          topics: parsedAnalysis.topics || [],
          confidence: 0.95
        },
        aiInsights: {
          difficulty: parsedAnalysis.difficulty || 'medium',
          estimatedReadTime: parsedAnalysis.estimatedReadTime || 10,
          keyConcepts: parsedAnalysis.keyConcepts || [],
          recommendations: parsedAnalysis.recommendations || []
        }
      }

      console.log('Successfully processed file:', file.name)
      return NextResponse.json(processedData)

    } catch (fileError) {
      console.error('File processing error:', fileError)
      return NextResponse.json(
        { error: `Failed to process file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

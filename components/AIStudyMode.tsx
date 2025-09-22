'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  BookOpen, 
  Target, 
  Zap, 
  Lightbulb, 
  TrendingUp,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  RotateCcw,
  Play,
  Pause,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface AIStudyModeProps {
  lectureData: any
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

interface ReviewItem {
  id: string
  title: string
  content: string
  type: 'concept' | 'definition' | 'example'
  importance: 'high' | 'medium' | 'low'
  notes?: string
}

interface PracticeExercise {
  id: string
  title: string
  description: string
  type: 'fill-blank' | 'matching' | 'true-false' | 'short-answer'
  content: any
  solution?: string
}

interface StudySession {
  id: string
  type: 'quiz' | 'review' | 'practice'
  startTime: Date
  endTime?: Date
  score?: number
  totalQuestions?: number
  correctAnswers?: number
}

interface StudyProgress {
  lectureId: string
  filename: string
  lastUpdated: string
  quizProgress: {
    currentQuestionIndex: number
    quizScore: number
    selectedAnswers: {[questionId: string]: number}
    isComplete: boolean
  }
  reviewProgress: {
    currentIndex: number
    completedItems: string[]
    notes: {[itemId: string]: string}
    isComplete: boolean
  }
  practiceProgress: {
    currentIndex: number
    completedExercises: string[]
    answers: {[exerciseId: string]: any}
    isComplete: boolean
  }
  sessionData: {
    startTime: string
    totalTimeSpent: number
    mode: 'quiz' | 'review' | 'practice'
  }
}

export default function AIStudyMode({ lectureData }: AIStudyModeProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [activeMode, setActiveMode] = useState<'quiz' | 'review' | 'practice' | 'analytics'>('quiz')
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [isQuizComplete, setIsQuizComplete] = useState(false)
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Review mode states
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [reviewNotes, setReviewNotes] = useState<{[key: string]: string}>({})
  const [isReviewComplete, setIsReviewComplete] = useState(false)

  // Practice mode states
  const [practiceExercises, setPracticeExercises] = useState<PracticeExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseAnswers, setExerciseAnswers] = useState<{[key: string]: any}>({})
  const [showSolution, setShowSolution] = useState(false)
  const [isPracticeComplete, setIsPracticeComplete] = useState(false)

  // Auto-save states
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date())

  // Auto-save functions
  const saveProgress = () => {
    if (!lectureData) return
    
    setIsSaving(true)
    
    const progress: StudyProgress = {
      lectureId: lectureData.filename || 'unknown',
      filename: lectureData.filename || 'unknown',
      lastUpdated: new Date().toISOString(),
      quizProgress: {
        currentQuestionIndex,
        quizScore,
        selectedAnswers: {}, // Will be populated
        isComplete: isQuizComplete
      },
      reviewProgress: {
        currentIndex: currentReviewIndex,
        completedItems: [],
        notes: reviewNotes,
        isComplete: isReviewComplete
      },
      practiceProgress: {
        currentIndex: currentExerciseIndex,
        completedExercises: [],
        answers: exerciseAnswers,
        isComplete: isPracticeComplete
      },
      sessionData: {
        startTime: sessionStartTime.toISOString(),
        totalTimeSpent: Date.now() - sessionStartTime.getTime(),
        mode: activeMode === 'analytics' ? 'quiz' : activeMode
      }
    }
    
    try {
      localStorage.setItem(`studyProgress_${lectureData.filename}`, JSON.stringify(progress))
      setLastSaved(new Date())
      console.log('Progress saved successfully')
    } catch (error) {
      console.error('Failed to save progress:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const loadProgress = () => {
    if (!lectureData) return
    
    try {
      const saved = localStorage.getItem(`studyProgress_${lectureData.filename}`)
      if (saved) {
        const progress: StudyProgress = JSON.parse(saved)
        
        // Restore quiz progress
        setCurrentQuestionIndex(progress.quizProgress.currentQuestionIndex)
        setQuizScore(progress.quizProgress.quizScore)
        setIsQuizComplete(progress.quizProgress.isComplete)
        
        // Restore review progress
        setCurrentReviewIndex(progress.reviewProgress.currentIndex)
        setReviewNotes(progress.reviewProgress.notes)
        setIsReviewComplete(progress.reviewProgress.isComplete)
        
        // Restore practice progress
        setCurrentExerciseIndex(progress.practiceProgress.currentIndex)
        setExerciseAnswers(progress.practiceProgress.answers)
        setIsPracticeComplete(progress.practiceProgress.isComplete)
        
        // Restore session data
        if (progress.sessionData.startTime) {
          setSessionStartTime(new Date(progress.sessionData.startTime))
        }
        
        console.log('Progress loaded successfully')
        return true
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
    }
    return false
  }

  const clearProgress = () => {
    if (!lectureData) return
    
    try {
      localStorage.removeItem(`studyProgress_${lectureData.filename}`)
      console.log('Progress cleared successfully')
    } catch (error) {
      console.error('Failed to clear progress:', error)
    }
  }

  useEffect(() => {
    if (lectureData && lectureData.content) {
      console.log('Lecture data received, locale:', locale)
      generateQuizQuestions(lectureData.content)
      generateReviewItems(lectureData)
      generatePracticeExercises(lectureData)
      
      // Load saved progress
      const hasProgress = loadProgress()
      if (hasProgress) {
        console.log('Resumed from saved progress')
      }
    }
  }, [lectureData, locale])

  // Auto-save triggers
  useEffect(() => {
    // Save progress when quiz state changes
    if (lectureData && (currentQuestionIndex > 0 || quizScore > 0 || isQuizComplete)) {
      saveProgress()
    }
  }, [currentQuestionIndex, quizScore, isQuizComplete])

  useEffect(() => {
    // Save progress when review state changes
    if (lectureData && (currentReviewIndex > 0 || Object.keys(reviewNotes).length > 0 || isReviewComplete)) {
      saveProgress()
    }
  }, [currentReviewIndex, reviewNotes, isReviewComplete])

  useEffect(() => {
    // Save progress when practice state changes
    if (lectureData && (currentExerciseIndex > 0 || Object.keys(exerciseAnswers).length > 0 || isPracticeComplete)) {
      saveProgress()
    }
  }, [currentExerciseIndex, exerciseAnswers, isPracticeComplete])

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lectureData) {
        saveProgress()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [lectureData])

  const generateQuizQuestions = async (content: string) => {
    console.log('generateQuizQuestions called with locale:', locale)
    setIsGeneratingQuiz(true)
    try {
      console.log('Generating quiz questions from content...')
      console.log('Current locale in function:', locale)
      
      console.log('Sending request with locale:', locale)
      console.log('Locale type:', typeof locale)
      console.log('Accept-Language header value:', locale)
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
          'X-Locale': locale
        },
        body: JSON.stringify({
          text: content,
          numQuestions: 12,
          difficulty: 'mixed'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate quiz')
      }

      const data = await response.json()
      console.log('Quiz generated successfully:', data.questions.length, 'questions')
      console.log('First question:', data.questions[0]?.question?.substring(0, 50))
      
      setQuizQuestions(data.questions)
    } catch (error) {
      console.error('Error generating quiz:', error)
      console.log('Using fallback questions for locale:', locale)
              // Fallback to basic questions
      const fallbackQuestions: QuizQuestion[] = [
        {
          id: '1',
          question: locale === 'vi' ? 'Nội dung tài liệu chủ yếu đề cập đến chủ đề gì?' : 'What is the main topic covered in the document?',
          options: locale === 'vi' ? [
            'A. Công nghệ thông tin',
            'B. Kinh tế chính trị',
            'C. Văn học nghệ thuật', 
            'D. Y học sinh học'
          ] : [
            'A. Information Technology',
            'B. Economics and Politics',
            'C. Literature and Arts', 
            'D. Medicine and Biology'
          ],
          correctAnswer: 1,
          explanation: locale === 'vi' ? 'Tài liệu tập trung vào các khái niệm và nguyên lý của kinh tế chính trị. Các lựa chọn khác không phù hợp với nội dung chính.' : 'The document focuses on concepts and principles of economics and politics. Other options are not relevant to the main content.',
          difficulty: 'easy',
          category: locale === 'vi' ? 'Tổng quan' : 'Overview'
        },
        {
          id: '2',
          question: locale === 'vi' ? 'Phương pháp học tập nào được khuyến nghị để hiểu sâu nội dung?' : 'Which learning method is recommended for deep understanding?',
          options: locale === 'vi' ? [
            'A. Học thuộc lòng',
            'B. Đọc hiểu và phân tích',
            'C. Chỉ xem qua một lần',
            'D. Bỏ qua phần khó'
          ] : [
            'A. Memorization',
            'B. Reading and analysis',
            'C. Just skim through once',
            'D. Skip difficult parts'
          ],
          correctAnswer: 1,
          explanation: locale === 'vi' ? 'Đọc hiểu và phân tích giúp nắm vững bản chất của các khái niệm. Học thuộc lòng không giúp hiểu sâu, còn xem qua hoặc bỏ qua sẽ không hiệu quả.' : 'Reading and analysis helps understand the essence of concepts. Memorization doesn\'t help deep understanding, while skimming or skipping is ineffective.',
          difficulty: 'medium',
          category: locale === 'vi' ? 'Phương pháp học tập' : 'Learning Methods'
        },
        {
          id: '3',
          question: locale === 'vi' ? 'Tại sao cần tạo flashcard khi học tập?' : 'Why create flashcards when studying?',
          options: locale === 'vi' ? [
            'A. Để trang trí',
            'B. Để ôn tập nhanh và hiệu quả',
            'C. Để tốn thời gian',
            'D. Để gây rối'
          ] : [
            'A. For decoration',
            'B. For quick and effective review',
            'C. To waste time',
            'D. To cause confusion'
          ],
          correctAnswer: 1,
          explanation: locale === 'vi' ? 'Flashcard giúp ôn tập nhanh và hiệu quả thông qua phương pháp spaced repetition. Các lựa chọn khác không đúng mục đích của flashcard.' : 'Flashcards help with quick and effective review through spaced repetition. Other options are not the purpose of flashcards.',
          difficulty: 'easy',
          category: locale === 'vi' ? 'Công cụ học tập' : 'Study Tools'
        },
        {
          id: '4',
          question: locale === 'vi' ? 'Làm thế nào để ghi nhớ kiến thức lâu dài?' : 'How to remember knowledge for a long time?',
          options: locale === 'vi' ? [
            'A. Chỉ đọc một lần',
            'B. Ôn tập định kỳ',
            'C. Bỏ qua phần khó',
            'D. Chỉ học khi có bài kiểm tra'
          ] : [
            'A. Read only once',
            'B. Regular review',
            'C. Skip difficult parts',
            'D. Only study before exams'
          ],
          correctAnswer: 1,
          explanation: locale === 'vi' ? 'Ôn tập định kỳ giúp củng cố kiến thức và ghi nhớ lâu dài. Các phương pháp khác không hiệu quả cho việc ghi nhớ bền vững.' : 'Regular review helps consolidate knowledge and remember long-term. Other methods are not effective for sustainable memory.',
          difficulty: 'medium',
          category: locale === 'vi' ? 'Kỹ năng học tập' : 'Study Skills'
        },
        {
          id: '5',
          question: locale === 'vi' ? 'Điều gì quan trọng nhất khi học một khái niệm mới?' : 'What is most important when learning a new concept?',
          options: locale === 'vi' ? [
            'A. Học thuộc định nghĩa',
            'B. Hiểu bản chất và ứng dụng',
            'C. Chỉ nhớ tên khái niệm',
            'D. Bỏ qua nếu khó hiểu'
          ] : [
            'A. Memorize the definition',
            'B. Understand the essence and application',
            'C. Only remember the concept name',
            'D. Skip if difficult to understand'
          ],
          correctAnswer: 1,
          explanation: locale === 'vi' ? 'Hiểu bản chất và ứng dụng giúp nắm vững khái niệm thay vì chỉ ghi nhớ bề ngoài. Điều này giúp áp dụng kiến thức vào thực tế.' : 'Understanding the essence and application helps master the concept instead of just surface memorization. This helps apply knowledge in practice.',
          difficulty: 'hard',
          category: locale === 'vi' ? 'Tư duy học tập' : 'Learning Thinking'
        }
      ]
      console.log('Setting fallback questions, locale:', locale)
      setQuizQuestions(fallbackQuestions)
    } finally {
      setIsGeneratingQuiz(false)
      console.log('Quiz generation completed, locale:', locale)
    }
  }

  const generateReviewItems = (data: any) => {
    const items: ReviewItem[] = []
    
    // Generate review items from summary
    if (data.summary) {
      items.push({
        id: 'summary-1',
        title: locale === 'vi' ? 'Tóm tắt chính' : 'Main Summary',
        content: data.summary.substring(0, 200) + '...',
        type: 'concept',
        importance: 'high'
      })
    }

    // Generate review items from key points
    if (data.keyPoints) {
      data.keyPoints.forEach((point: any, index: number) => {
        items.push({
          id: `keypoint-${index}`,
          title: locale === 'vi' ? `Điểm chính ${index + 1}` : `Key Point ${index + 1}`,
          content: point.content,
          type: 'concept',
          importance: index < 3 ? 'high' : 'medium'
        })
      })
    }

    // Generate review items from objectives
    if (data.objectives) {
      data.objectives.forEach((obj: any, index: number) => {
        items.push({
          id: `objective-${index}`,
          title: obj.title,
          content: obj.description,
          type: 'definition',
          importance: obj.importance === 'high' ? 'high' : 'medium'
        })
      })
    }

    setReviewItems(items)
  }

  const generatePracticeExercises = (data: any) => {
    const exercises: PracticeExercise[] = []
    
    // Fill in the blank exercises
    exercises.push({
      id: 'fill-1',
      title: locale === 'vi' ? 'Điền từ còn thiếu' : 'Fill in the blanks',
      description: locale === 'vi' ? 'Hoàn thành câu bằng cách điền từ thích hợp' : 'Complete the sentence by filling in appropriate words',
      type: 'fill-blank',
      content: {
        sentence: locale === 'vi' ? 'Tài liệu này chứa nhiều khái niệm quan trọng về ___ và ___' : 'This document contains many important concepts about ___ and ___',
        blanks: locale === 'vi' ? ['học tập', 'phân tích'] : ['learning', 'analysis']
      },
      solution: locale === 'vi' ? 'Tài liệu này chứa nhiều khái niệm quan trọng về học tập và phân tích' : 'This document contains many important concepts about learning and analysis'
    })

    // True/False exercises
    exercises.push({
      id: 'tf-1',
      title: locale === 'vi' ? 'Câu hỏi đúng/sai' : 'True/False Questions',
      description: locale === 'vi' ? 'Chọn đúng hoặc sai cho các phát biểu sau' : 'Choose true or false for the following statements',
      type: 'true-false',
      content: {
        statements: locale === 'vi' ? [
          'Tài liệu này phù hợp cho việc học tập và nghiên cứu',
          'Không cần đọc kỹ để hiểu nội dung',
          'Có thể tạo flashcard để ôn tập'
        ] : [
          'This document is suitable for learning and research',
          'No need to read carefully to understand the content',
          'You can create flashcards for review'
        ],
        answers: [true, false, true]
      }
    })

    // Short answer exercises
    exercises.push({
      id: 'sa-1',
      title: locale === 'vi' ? 'Câu hỏi ngắn' : 'Short Answer Questions',
      description: locale === 'vi' ? 'Trả lời ngắn gọn các câu hỏi sau' : 'Answer the following questions briefly',
      type: 'short-answer',
      content: {
        questions: locale === 'vi' ? [
          'Nêu 3 phương pháp học tập hiệu quả từ tài liệu này',
          'Tại sao cần tạo flashcard khi học?',
          'Làm thế nào để ghi nhớ kiến thức lâu dài?'
        ] : [
          'List 3 effective learning methods from this document',
          'Why create flashcards when studying?',
          'How to remember knowledge for a long time?'
        ]
      },
      solution: locale === 'vi' ? '1) Đọc hiểu, tạo flashcard, làm quiz. 2) Giúp ôn tập nhanh. 3) Ôn tập định kỳ.' : '1) Read and understand, create flashcards, take quizzes. 2) Helps quick review. 3) Regular review.'
    })

    setPracticeExercises(exercises)
  }

  const startQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setQuizScore(0)
    setIsQuizComplete(false)
    
    const session: StudySession = {
      id: Date.now().toString(),
      type: 'quiz',
      startTime: new Date()
    }
    setStudySessions(prev => [...prev, session])
  }

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
  }

  const submitAnswer = () => {
    if (selectedAnswer === null) return
    
    const currentQuestion = quizQuestions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1)
    }
    
    setShowExplanation(true)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      completeQuiz()
    }
  }

  const completeQuiz = () => {
    setIsQuizComplete(true)
    const currentSession = studySessions[studySessions.length - 1]
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        endTime: new Date(),
        score: quizScore,
        totalQuestions: quizQuestions.length,
        correctAnswers: quizScore
      }
      setStudySessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s))
    }
  }

  const resetQuiz = () => {
    startQuiz()
  }

  const startReview = () => {
    setCurrentReviewIndex(0)
    setIsReviewComplete(false)
    setReviewNotes({})
    
    const session: StudySession = {
      id: Date.now().toString(),
      type: 'review',
      startTime: new Date()
    }
    setStudySessions(prev => [...prev, session])
  }

  const nextReviewItem = () => {
    if (currentReviewIndex < reviewItems.length - 1) {
      setCurrentReviewIndex(prev => prev + 1)
    } else {
      setIsReviewComplete(true)
    }
  }

  const updateReviewNotes = (itemId: string, notes: string) => {
    setReviewNotes(prev => ({ ...prev, [itemId]: notes }))
  }

  const startPractice = () => {
    setCurrentExerciseIndex(0)
    setIsPracticeComplete(false)
    setExerciseAnswers({})
    setShowSolution(false)
    
    const session: StudySession = {
      id: Date.now().toString(),
      type: 'practice',
      startTime: new Date()
    }
    setStudySessions(prev => [...prev, session])
  }

  const nextExercise = () => {
    if (currentExerciseIndex < practiceExercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
      setShowSolution(false)
    } else {
      setIsPracticeComplete(true)
    }
  }

  const submitExerciseAnswer = (exerciseId: string, answer: any) => {
    setExerciseAnswers(prev => ({ ...prev, [exerciseId]: answer }))
  }

  const filteredQuestions = quizQuestions.filter(q => {
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false
    if (selectedCategory !== 'all' && q.category !== selectedCategory) return false
    return true
  })

  // Reset currentQuestionIndex when filters change or when it's out of bounds
  useEffect(() => {
    if (filteredQuestions.length > 0) {
      if (currentQuestionIndex >= filteredQuestions.length || currentQuestionIndex < 0) {
        setCurrentQuestionIndex(0)
      }
    } else {
      // If no filtered questions, reset to 0
      setCurrentQuestionIndex(0)
    }
  }, [filteredQuestions.length, currentQuestionIndex, selectedDifficulty, selectedCategory])

  const categories = Array.from(new Set(quizQuestions.map(q => q.category)))

  if (activeMode === 'quiz') {
    if (isGeneratingQuiz) {
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">{t('study.quiz.aiGeneratingQuestions')}</h3>
          <p className="text-gray-600">{t('study.quiz.analyzingContent')}</p>
        </motion.div>
      )
    }

    if (isQuizComplete) {
      const percentage = Math.round((quizScore / quizQuestions.length) * 100)
      const performance = percentage >= 80 ? t('study.quiz.excellent') : percentage >= 60 ? t('study.quiz.good') : percentage >= 40 ? t('study.quiz.average') : t('study.quiz.needsImprovement')
      
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-4">{t('study.quiz.quizResults')}</h2>
            <div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
            <div className="text-xl text-gray-600 mb-4">{performance}</div>
            <div className="text-lg">
              {t('study.quiz.youAnsweredCorrectly')} <span className="font-bold text-green-600">{quizScore}</span> / <span className="font-bold">{quizQuestions.length}</span> {t('study.quiz.questions')}
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={resetQuiz} className="btn-primary">
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('study.quiz.retake')}
            </button>
            <button onClick={() => setActiveMode('analytics')} className="btn-accent">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('study.quiz.viewAnalytics')}
            </button>
          </div>
        </motion.div>
      )
    }

    if (filteredQuestions.length === 0) {
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">{t('study.quiz.noQuestions')}</h3>
                      <p className="text-gray-600 mb-4">{t('study.quiz.letAIGenerate')}</p>
          <button onClick={() => generateQuizQuestions(lectureData?.content || '')} className="btn-primary">
            <Zap className="w-4 h-4 mr-2" />
            {t('study.quiz.letAIGenerate')}
          </button>
        </motion.div>
      )
    }

    const currentQuestion = filteredQuestions[currentQuestionIndex]
    
    // Safety check - if currentQuestion is undefined, show error or reset
    if (!currentQuestion) {
      // Auto-reset currentQuestionIndex if it's out of bounds
      if (filteredQuestions.length > 0 && (currentQuestionIndex < 0 || currentQuestionIndex >= filteredQuestions.length)) {
        setCurrentQuestionIndex(0)
        return null // Return null to prevent rendering while resetting
      }
      
      // If no questions available, show message
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('study.quiz.noQuestions')}</h3>
          <p className="text-gray-600 mb-4">{t('study.quiz.letAIGenerate')}</p>
          <button onClick={() => generateQuizQuestions(lectureData?.content || '')} className="btn-primary">
            <Zap className="w-4 h-4 mr-2" />
            {t('study.quiz.letAIGenerate')}
          </button>
        </motion.div>
      )
    }

    return (
      <motion.div 
        className="glass p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            {t('study.quiz.smartQuizWithAI')}
          </h2>
          <div className="flex gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value as any)
                setCurrentQuestionIndex(0) // Reset to first question when filter changes
              }}
              className="input w-32"
            >
              <option value="all">{t('study.quiz.allDifficulties')}</option>
              <option value="easy">{t('flashcards.easy')}</option>
              <option value="medium">{t('flashcards.medium')}</option>
              <option value="hard">{t('flashcards.hard')}</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentQuestionIndex(0) // Reset to first question when filter changes
              }}
              className="input w-40"
            >
              <option value="all">{t('study.quiz.allCategories')}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="badge-accent">
                {t('study.quiz.question')} {currentQuestionIndex + 1} / {filteredQuestions.length}
              </span>
              <span className="text-sm text-gray-600">
                {locale === 'vi' ? 'Tổng câu hỏi:' : 'Total questions:'} {quizQuestions.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge-${currentQuestion.difficulty === 'easy' ? 'success' : currentQuestion.difficulty === 'medium' ? 'warning' : 'danger'}`}>
                {currentQuestion.difficulty === 'easy' ? t('flashcards.easy') : currentQuestion.difficulty === 'medium' ? t('flashcards.medium') : t('flashcards.hard')}
              </span>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {currentQuestion.category}
              </span>
            </div>
          </div>
          
          <div className="card p-8 text-center mb-6">
            <h3 className="text-xl font-semibold mb-4">{t('study.quiz.question')}:</h3>
            <p className="text-lg mb-6">{currentQuestion.question}</p>
            
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.5 }}
              >
                <h4 className="text-lg font-semibold mb-3">{t('study.quiz.answer')}:</h4>
                <p className="text-lg text-gray-700">{currentQuestion.explanation}</p>
              </motion.div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showExplanation}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${
                  showExplanation
                    ? index === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : selectedAnswer === index
                      ? 'border-red-500 bg-red-50'
                      : ''
                    : ''
                }`}
              >
                <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <div className="text-lg">
              {t('study.score')}: <span className="font-bold text-blue-600">{quizScore}</span> / {currentQuestionIndex + 1}
            </div>
            
            {!showExplanation ? (
              <button
                onClick={submitAnswer}
                disabled={selectedAnswer === null}
                className="btn-primary"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('study.quiz.submitAnswer')}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="btn-accent"
              >
                {currentQuestionIndex < filteredQuestions.length - 1 ? t('study.quiz.nextQuestion') : t('study.quiz.complete')}
                <Zap className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (activeMode === 'review') {
    if (reviewItems.length === 0) {
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">{t('study.review.noReviewContent')}</h3>
                          <p className="text-gray-600 mb-4">{t('study.review.noContent')}</p>
        </motion.div>
      )
    }

    if (isReviewComplete) {
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-4">{t('study.review.reviewComplete')}</h2>
            <div className="text-6xl font-bold text-green-600 mb-2">✓</div>
            <div className="text-xl text-gray-600 mb-4">{t('study.review.youReviewed')} {reviewItems.length} {t('study.review.importantPoints')}</div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={startReview} className="btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('study.review.reviewAgain')}
            </button>
            <button onClick={() => setActiveMode('analytics')} className="btn-accent">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('study.quiz.viewAnalytics')}
            </button>
          </div>
        </motion.div>
      )
    }

    const currentItem = reviewItems[currentReviewIndex]

    return (
      <motion.div 
        className="glass p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            {t('study.smartReview')}
          </h2>
          <div className="text-sm text-gray-600">
            {currentReviewIndex + 1} / {reviewItems.length}
          </div>
        </div>

        <div className="card p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">{currentItem.title}</h3>
            <span className={`badge-${currentItem.importance === 'high' ? 'danger' : currentItem.importance === 'medium' ? 'warning' : 'success'}`}>
              {currentItem.importance === 'high' ? t('summary.importance.high') : currentItem.importance === 'medium' ? t('summary.importance.medium') : t('summary.importance.low')}
            </span>
          </div>
          
          <div className="mb-6">
            <p className="text-lg text-gray-700 leading-relaxed">{currentItem.content}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('study.review.yourNotes')}
            </label>
            <textarea
              value={reviewNotes[currentItem.id] || ''}
              onChange={(e) => updateReviewNotes(currentItem.id, e.target.value)}
              placeholder={t('study.review.writeNotes')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentReviewIndex(prev => Math.max(0, prev - 1))}
              disabled={currentReviewIndex === 0}
              className="btn-secondary"
            >
              <Pause className="w-4 h-4 mr-2" />
              {t('study.review.previous')}
            </button>
            
            <button
              onClick={nextReviewItem}
              className="btn-primary"
            >
              {currentReviewIndex < reviewItems.length - 1 ? t('study.review.next') : t('study.quiz.complete')}
              <Play className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (activeMode === 'practice') {
    if (practiceExercises.length === 0) {
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">{t('study.practice.noPracticeContent')}</h3>
                          <p className="text-gray-600 mb-4">{t('study.practice.noContent')}</p>
        </motion.div>
      )
    }

    if (isPracticeComplete) {
      return (
        <motion.div 
          className="glass p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-4">{t('study.practice.practiceComplete')}</h2>
            <div className="text-6xl font-bold text-yellow-600 mb-2">🎯</div>
            <div className="text-xl text-gray-600 mb-4">{t('study.practice.youCompleted')} {practiceExercises.length} {t('study.practice.exercises')}</div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={startPractice} className="btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('study.practice.practiceAgain')}
            </button>
            <button onClick={() => setActiveMode('analytics')} className="btn-accent">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('study.quiz.viewAnalytics')}
            </button>
          </div>
        </motion.div>
      )
    }

    const currentExercise = practiceExercises[currentExerciseIndex]

    return (
      <motion.div 
        className="glass p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            {t('study.practice.practice')}
          </h2>
          <div className="text-sm text-gray-600">
            {currentExerciseIndex + 1} / {practiceExercises.length}
          </div>
        </div>

        <div className="card p-8 mb-6">
          <h3 className="text-xl font-semibold mb-4">{currentExercise.title}</h3>
          <p className="text-gray-600 mb-6">{currentExercise.description}</p>

          {currentExercise.type === 'fill-blank' && (
            <div className="mb-6">
              <p className="text-lg mb-4">{currentExercise.content.sentence}</p>
              <div className="space-y-3">
                {currentExercise.content.blanks.map((blank: string, index: number) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={locale === 'vi' ? `Điền từ ${index + 1}` : `Fill word ${index + 1}`}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) => submitExerciseAnswer(currentExercise.id, { ...exerciseAnswers[currentExercise.id], [index]: e.target.value })}
                  />
                ))}
              </div>
            </div>
          )}

          {currentExercise.type === 'true-false' && (
            <div className="mb-6">
              <div className="space-y-4">
                {currentExercise.content.statements.map((statement: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <span className="text-lg">{statement}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitExerciseAnswer(currentExercise.id, { ...exerciseAnswers[currentExercise.id], [index]: true })}
                        className={`px-4 py-2 rounded-lg border ${
                          exerciseAnswers[currentExercise.id]?.[index] === true
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t('study.practice.true')}
                      </button>
                      <button
                        onClick={() => submitExerciseAnswer(currentExercise.id, { ...exerciseAnswers[currentExercise.id], [index]: false })}
                        className={`px-4 py-2 rounded-lg border ${
                          exerciseAnswers[currentExercise.id]?.[index] === false
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t('study.practice.false')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentExercise.type === 'short-answer' && (
            <div className="mb-6">
              <div className="space-y-4">
                {currentExercise.content.questions.map((question: string, index: number) => (
                  <div key={index}>
                    <p className="text-lg mb-2">{question}</p>
                    <textarea
                      placeholder={t('study.practice.enterAnswer')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      onChange={(e) => submitExerciseAnswer(currentExercise.id, { ...exerciseAnswers[currentExercise.id], [index]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSolution && currentExercise.solution && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.5 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <h4 className="font-semibold text-green-800 mb-2">{t('study.practice.solution')}:</h4>
              <p className="text-green-700">{currentExercise.solution}</p>
            </motion.div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}
              disabled={currentExerciseIndex === 0}
              className="btn-secondary"
            >
              <Pause className="w-4 h-4 mr-2" />
              {t('study.review.previous')}
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="btn-accent"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showSolution ? t('study.practice.hideSolution') : t('study.practice.showSolution')}
              </button>
              
              <button
                onClick={nextExercise}
                className="btn-primary"
              >
                {currentExerciseIndex < practiceExercises.length - 1 ? t('study.review.next') : t('study.quiz.complete')}
                <Play className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (activeMode === 'analytics') {
    const totalSessions = studySessions.length
    const totalQuestions = studySessions.reduce((sum, session) => sum + (session.totalQuestions || 0), 0)
    const totalCorrect = studySessions.reduce((sum, session) => sum + (session.correctAnswers || 0), 0)
    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    return (
      <motion.div 
        className="glass p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            {t('study.analytics.studyAnalytics')}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setActiveMode('quiz')} className="btn-primary">
              <Target className="w-4 h-4 mr-2" />
              {t('study.analytics.startQuiz')}
            </button>
            <button onClick={() => setActiveMode('review')} className="btn-accent">
              <BookOpen className="w-4 h-4 mr-2" />
              {t('study.analytics.startReview')}
            </button>
            <button onClick={() => setActiveMode('practice')} className="btn-warning">
              <Zap className="w-4 h-4 mr-2" />
              {t('study.analytics.startPractice')}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{totalSessions}</div>
            <div className="text-gray-600">{t('study.analytics.studySessions')}</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{totalQuestions}</div>
            <div className="text-gray-600">{t('study.analytics.totalQuestions')}</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{averageScore}%</div>
            <div className="text-gray-600">{t('study.analytics.averageScore')}</div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">{t('study.analytics.studyHistory')}</h3>
          {studySessions.length > 0 ? (
            <div className="space-y-3">
              {studySessions.map((session, index) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {session.type === 'quiz' ? t('study.analytics.quiz') : session.type === 'review' ? t('study.analytics.review') : t('study.analytics.practice')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {session.startTime.toLocaleDateString()} - {session.startTime.toLocaleTimeString()}
                    </div>
                  </div>
                  {session.score !== undefined && (
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{session.score}/{session.totalQuestions}</div>
                      <div className="text-sm text-gray-600">
                        {Math.round((session.score / (session.totalQuestions || 1)) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
                              {t('study.analytics.noSessions')}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="glass p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Auto-save indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSaving ? (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">{locale === 'vi' ? 'Đang lưu tiến độ...' : 'Saving progress...'}</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                {locale === 'vi' ? 'Đã lưu' : 'Saved'} {lastSaved.toLocaleTimeString()}
              </span>
            </div>
          ) : null}
        </div>
        
        {/* Progress management buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearProgress}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            title={locale === 'vi' ? 'Xóa tiến độ học tập' : 'Clear study progress'}
          >
            <RotateCcw className="w-3 h-3" />
            {locale === 'vi' ? 'Xóa tiến độ' : 'Clear Progress'}
          </button>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
          <Brain className="w-8 h-8" />
          {t('study.smartStudyMode')}
        </h2>
        <p className="text-lg text-gray-600">
          {t('study.chooseStudyMode')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.button
          onClick={() => setActiveMode('quiz')}
          className="card p-6 text-center hover:scale-105 transition-transform cursor-pointer"
          whileHover={{ y: -5 }}
        >
          <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('study.smartQuiz')}</h3>
          <p className="text-gray-600">{t('study.smartQuizDesc')}</p>
        </motion.button>

        <motion.button
          onClick={() => setActiveMode('review')}
          className="card p-6 text-center hover:scale-105 transition-transform cursor-pointer"
          whileHover={{ y: -5 }}
        >
          <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('study.smartReview')}</h3>
          <p className="text-gray-600">{t('study.smartReviewDesc')}</p>
        </motion.button>

        <motion.button
          onClick={() => setActiveMode('practice')}
          className="card p-6 text-center hover:scale-105 transition-transform cursor-pointer"
          whileHover={{ y: -5 }}
        >
          <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('study.practice')}</h3>
          <p className="text-gray-600">{t('study.practiceDesc')}</p>
        </motion.button>

        <motion.button
          onClick={() => setActiveMode('analytics')}
          className="card p-6 text-center hover:scale-105 transition-transform cursor-pointer"
          whileHover={{ y: -5 }}
        >
          <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('study.studyAnalytics')}</h3>
          <p className="text-gray-600">{t('study.studyAnalyticsDesc')}</p>
        </motion.button>
      </div>
    </motion.div>
  )
}

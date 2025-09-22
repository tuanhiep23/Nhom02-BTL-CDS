'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  X, 
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  Eye,
  Download
} from 'lucide-react'
import LoadingProgress from './LoadingProgress'
import { useTranslations, useLocale } from 'next-intl'

interface FileUploadProps {
  onFileProcessed: (data: any) => void
}

interface FileData {
  id: string
  file: File
  name: string
  type: string
  size: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  content?: string
  extractedText?: string
  summary?: string
  metadata?: any
  errorMessage?: string
}

export default function FileUpload({ onFileProcessed }: FileUploadProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [files, setFiles] = useState<FileData[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [processingQueue, setProcessingQueue] = useState<string[]>([])
  const [loadingState, setLoadingState] = useState({
    isVisible: false,
    currentStep: 'uploading',
    progress: 0,
    estimatedTime: 45
  })

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-500" />
    if (fileType.startsWith('video/')) return <FileVideo className="w-8 h-8 text-red-500" />
    if (fileType.startsWith('audio/')) return <FileAudio className="w-8 h-6 text-green-500" />
    return <FileText className="w-8 h-8 text-gray-500" />
  }

  const getFileTypeName = (fileType: string) => {
    if (fileType.startsWith('image/')) return t('upload.fileTypes.image')
    if (fileType.startsWith('video/')) return t('upload.fileTypes.video')
    if (fileType.startsWith('audio/')) return t('upload.fileTypes.audio')
    if (fileType.includes('pdf')) return 'PDF'
    if (fileType.includes('word') || fileType.includes('document')) return 'Word'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'PowerPoint'
    if (fileType.includes('text')) return t('upload.fileTypes.text')
    return t('upload.fileTypes.document')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileData[] = acceptedFiles.map(file => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
    
    // Process each file
    newFiles.forEach(fileData => {
      processFile(fileData)
    })
  }, [])

  const processFile = async (fileData: FileData) => {
    try {
      // Show loading progress
      setLoadingState({
        isVisible: true,
        currentStep: 'uploading',
        progress: 0,
        estimatedTime: 45
      })

      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'processing', progress: 0 } : f
      ))

      // Progress steps with detailed descriptions
      const progressSteps = [
        { step: 'uploading', progress: 10, description: t('loading.uploading') },
        { step: 'processing', progress: 30, description: t('loading.processing') },
        { step: 'generating', progress: 70, description: t('upload.aiAnalyzingAndGenerating') },
        { step: 'complete', progress: 100, description: t('loading.complete') }
      ]

      let currentStepIndex = 0
      const progressInterval = setInterval(() => {
        if (currentStepIndex < progressSteps.length - 1) {
          const step = progressSteps[currentStepIndex]
          setLoadingState(prev => ({
            ...prev,
            currentStep: step.step,
            progress: step.progress
          }))
          currentStepIndex++
        }
      }, 3000) // Update every 3 seconds

      // Gọi API thực tế để xử lý file
      const formData = new FormData()
      formData.append('file', fileData.file)

      const response = await fetch('/api/process-file', {
        method: 'POST',
        headers: {
          'Accept-Language': locale
        },
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process file')
      }

      const processedData = await response.json()

      // Update loading state to complete
      setLoadingState(prev => ({
        ...prev,
        currentStep: 'complete',
        progress: 100
      }))

      // Hide loading after a short delay
      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, isVisible: false }))
      }, 1000)

      // Update status to completed
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'completed', progress: 100 } : f
      ))

      // Pass processed data to parent component
      onFileProcessed(processedData)

    } catch (error) {
      console.error('Error processing file:', error)
      
      // Hide loading on error
      setLoadingState(prev => ({ ...prev, isVisible: false }))
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        } : f
      ))
    }
  }

  const simulateAIProcessing = async (fileData: FileData) => {
    const steps = [
      t('loading.uploading'),
      t('upload.analyzingFormat'),
      t('upload.extractingContent'),
      t('upload.processingOCR'),
      t('upload.semanticAnalysis'),
              t('upload.generatingSummary'),
      t('loading.complete')
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      const progress = ((i + 1) / steps.length) * 100
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, progress } : f
      ))
    }
  }

  const generateProcessedData = (fileData: FileData) => {
    const mockContent = generateMockContent(fileData)
    
    return {
      id: fileData.id,
      filename: fileData.name,
      type: fileData.type,
      size: fileData.size,
      content: mockContent,
      extractedText: mockContent,
      summary: `${t('upload.aiAnalyzed')} ${fileData.name} ${t('upload.andExtractedContent')}. ${t('upload.documentContainsImportantInfo')}`,
      metadata: {
        pages: Math.floor(Math.random() * 50) + 1,
        wordCount: Math.floor(Math.random() * 5000) + 500,
        language: 'Vietnamese',
        topics: ['AI', 'Machine Learning', 'Education', 'Technology'],
        confidence: 0.95
      },
      aiInsights: {
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        estimatedReadTime: Math.floor(Math.random() * 30) + 5,
        keyConcepts: [t('upload.conceptA'), t('upload.conceptB'), t('upload.conceptC')],
        recommendations: [t('upload.basicReview'), t('upload.practicalApplication'), t('upload.expandKnowledge')]
      }
    }
  }

  const generateMockContent = (fileData: FileData) => {
    const baseContent = `${t('upload.thisIsContentExtractedByAI')} ${fileData.name}. 
    
    ${t('upload.aiHasAnalyzedAndProcessed')}:
    - ${t('upload.extractTextAndMainContent')}
    - ${t('upload.analyzeStructureAndOrganization')}
    - ${t('upload.identifyConceptsAndKeyPoints')}
    - ${t('upload.createSummaryAndLearningSuggestions')}
    
    ${t('upload.contentIncludesTopics')} ${t('upload.aiTechnologyMachineLearning')} ${t('upload.andApplicationsInEducation')}. 
    ${t('upload.documentProvidesBasicAndAdvancedKnowledge')}.`
    
    return baseContent
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const retryFile = (fileData: FileData) => {
    processFile(fileData)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    onDrop(droppedFiles)
  }

  return (
    <motion.div 
      className="glass p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
          <Brain className="w-8 h-8" />
          {t('upload.titleWithAI')}
        </h2>
        <p className="text-lg text-gray-600">
          {t('upload.aiDescription')}
        </p>
      </div>

      {/* Upload Area */}
      <motion.div
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
      >
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">{t('upload.dragDropHere')}</h3>
        <p className="text-gray-600 mb-4">
          {t('upload.orClickToSelect')}
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <span className="badge-success">PDF</span>
          <span className="badge-success">Word (DOCX)</span>
          <span className="badge-success">Text (TXT)</span>
        </div>
        
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || [])
            onDrop(selectedFiles)
          }}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="btn-primary cursor-pointer">
          <Sparkles className="w-4 h-4 mr-2" />
          {t('upload.selectFile')}
        </label>
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('upload.fileList')} ({files.length})
          </h3>
          
          <div className="space-y-4">
            {files.map((fileData) => (
              <motion.div
                key={fileData.id}
                className="card p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  {getFileIcon(fileData.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{fileData.name}</h4>
                      <span className="badge-muted text-xs">
                        {getFileTypeName(fileData.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(fileData.size)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {fileData.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    )}
                    
                    {fileData.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                        <span className="text-sm text-yellow-600">{t('upload.aiProcessing')}</span>
                      </div>
                    )}
                    
                    {fileData.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    
                    {fileData.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    
                    <button
                      onClick={() => removeFile(fileData.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {fileData.status === 'processing' && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${fileData.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(fileData.progress)}% {t('loading.completed')}
                    </p>
                  </div>
                )}
                
                {/* Error State */}
                {fileData.status === 'error' && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 mb-2">
                      {t('upload.errorProcessingFile')}
                    </p>
                    {fileData.errorMessage && (
                      <p className="text-xs text-red-500 mb-2 font-mono">
                        {fileData.errorMessage}
                      </p>
                    )}
                                          <button
                        onClick={() => retryFile(fileData)}
                        className="btn-secondary text-sm"
                      >
                        {t('upload.retry')}
                      </button>
                  </div>
                )}
                
                {/* Completed State */}
                {fileData.status === 'completed' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 mb-2">
                      {t('upload.aiProcessedSuccessfully')}
                    </p>
                    <div className="flex gap-2">
                      <button className="btn-secondary text-sm">
                        <Eye className="w-3 h-3 mr-1" />
                        {t('upload.viewResults')}
                      </button>
                      <button className="btn-secondary text-sm">
                        <Download className="w-3 h-3 mr-1" />
                        {t('upload.download')}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Processing Info */}
      <motion.div
        className="mt-8 card p-6 bg-gradient-to-r from-blue-50 to-purple-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          {t('upload.aiWillAutomaticallyProcess')}
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">{t('upload.processingWorkflow')}:</h4>
            <ul className="space-y-1">
              <li>• {t('upload.analyzeFileFormat')}</li>
              <li>• {t('upload.extractTextOCR')}</li>
              <li>• {t('upload.semanticContentAnalysis')}</li>
                              <li>• {t('upload.smartSummary')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t('upload.resultsReceived')}:</h4>
            <ul className="space-y-1">
              <li>• {t('upload.extractedContent')}</li>
              <li>• {t('upload.aiSummaryWithGemini')}</li>
              <li>• {t('upload.smartFlashcards')}</li>
              <li>• {t('upload.analysisAndLearningSuggestions')}</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Loading Progress Modal */}
      <LoadingProgress
        isVisible={loadingState.isVisible}
        currentStep={loadingState.currentStep}
        progress={loadingState.progress}
        estimatedTime={loadingState.estimatedTime}
        onCancel={() => {
          setLoadingState(prev => ({ ...prev, isVisible: false }))
          // TODO: Implement actual cancellation logic
        }}
      />
    </motion.div>
  )
}

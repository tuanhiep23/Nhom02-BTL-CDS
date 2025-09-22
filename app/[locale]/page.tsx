'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/components/AuthContext'
import AuthPage from '@/components/AuthPage'
import Header from '@/components/Header'
import FileUpload from '@/components/FileUpload'
import LectureSummary from '@/components/LectureSummary'
import FlashcardCreator from '@/components/FlashcardCreator'
import SmartSearch from '@/components/SmartSearch'
import AIStudyMode from '@/components/AIStudyMode'
import { motion } from 'framer-motion'

export default function Home() {
  const t = useTranslations()
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [lectureData, setLectureData] = useState<any>(null)

  // Load lectureData from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLectureData = localStorage.getItem('currentLectureData')
      if (savedLectureData) {
        try {
          const parsedData = JSON.parse(savedLectureData)
          setLectureData(parsedData)
          // Auto-switch to summary tab if lecture data exists
          setActiveTab('summary')
        } catch (error) {
          console.error('Error parsing saved lecture data:', error)
          localStorage.removeItem('currentLectureData')
        }
      }
    }
  }, [])

  // Save lectureData to localStorage whenever it changes
  useEffect(() => {
    if (lectureData && typeof window !== 'undefined') {
      localStorage.setItem('currentLectureData', JSON.stringify(lectureData))
    }
  }, [lectureData])

  const tabs = [
    { id: 'upload', name: t('navigation.upload'), icon: '📁', color: 'primary' },
    { id: 'summary', name: t('navigation.summary'), icon: '📝', color: 'accent' },
    { id: 'flashcards', name: t('navigation.flashcards'), icon: '🗂️', color: 'success' },
    { id: 'search', name: t('navigation.search'), icon: '🔍', color: 'warning' },
    { id: 'study', name: t('navigation.study'), icon: '🎓', color: 'danger' }
  ]

  const handleFileProcessed = (data: any) => {
    setLectureData(data)
    setActiveTab('summary')
  }

  const clearLectureData = () => {
    if (lectureData && typeof window !== 'undefined') {
      // Clear current lecture data
      localStorage.removeItem('currentLectureData')
      
      // Clear study progress and chat history for the current lecture
      const filename = lectureData.filename
      if (filename) {
        localStorage.removeItem(`studyProgress_${filename}`)
        localStorage.removeItem(`chatHistory_${filename}`)
      }
    }
    
    setLectureData(null)
    setActiveTab('upload')
  }

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />
  }

  const getTabButtonClass = (tab: any) => {
    const baseClass = "py-4 px-6 border-b-2 font-medium text-sm transition-all duration-300 rounded-t-xl"
    const isActive = activeTab === tab.id
    
    if (isActive) {
      return `${baseClass} border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50/50`
    }
    
    return `${baseClass} border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/50`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Enhanced Navigation Tabs */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabButtonClass(tab)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                {tab.name}
              </motion.button>
            ))}
          </div>
        </div>
      </nav>

      {/* Enhanced Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-8"
        >
          {activeTab === 'upload' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              {lectureData && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <span className="text-lg">📚</span>
                    <div>
                      <p className="font-medium">{t('upload.currentLecture')}: {lectureData.filename}</p>
                      <p className="text-sm opacity-80">{t('upload.lecturePersisted')}</p>
                    </div>
                  </div>
                </div>
              )}
              <FileUpload onFileProcessed={handleFileProcessed} />
            </div>
          )}
          {activeTab === 'summary' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              {lectureData ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">{t('summary.title')}</h2>
                    <button
                      onClick={clearLectureData}
                      className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title={t('summary.clearLecture')}
                    >
                      🗑️ {t('summary.clearLecture')}
                    </button>
                  </div>
                  <LectureSummary lectureData={lectureData} />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">📝</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 dark:text-white">{t('summary.noContent')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{t('summary.noContentSubtitle')}</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('summary.uploadNow')}
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'flashcards' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              {lectureData ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">{t('flashcards.title')}</h2>
                    <button
                      onClick={clearLectureData}
                      className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title={t('summary.clearLecture')}
                    >
                      🗑️ {t('summary.clearLecture')}
                    </button>
                  </div>
                  <FlashcardCreator lectureData={lectureData} />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🗂️</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 dark:text-white">{t('summary.noContent')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{t('flashcards.noContent')}</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('summary.uploadNow')}
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'search' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              {lectureData ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">{t('search.title')}</h2>
                    <button
                      onClick={clearLectureData}
                      className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title={t('summary.clearLecture')}
                    >
                      🗑️ {t('summary.clearLecture')}
                    </button>
                  </div>
                  <SmartSearch lectureData={lectureData} />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 dark:text-white">{t('summary.noContent')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{t('search.noResultsSubtitle')}</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('summary.uploadNow')}
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'study' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              {lectureData ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">{t('study.title')}</h2>
                    <button
                      onClick={clearLectureData}
                      className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title={t('summary.clearLecture')}
                    >
                      🗑️ {t('summary.clearLecture')}
                    </button>
                  </div>
                  <AIStudyMode lectureData={lectureData} />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🎓</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 dark:text-white">{t('summary.noContent')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{t('study.quiz.noQuestionsSubtitle')}</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('summary.uploadNow')}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❤️</span>
              </div>
              <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                {t('footer.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('footer.subtitle')}
              </p>
            </div>
            
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2">{t('footer.supportedFiles')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('footer.supportedFilesList')}</p>
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2">{t('footer.aiEngine')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('footer.aiEngineList')}</p>
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2">{t('footer.frontend')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('footer.frontendList')}</p>
                </div>
              </div>
            
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('footer.copyright')}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                  {t('footer.designBy')} <span className="font-medium text-purple-600">Hằng</span> ❤️
                </p>
              </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

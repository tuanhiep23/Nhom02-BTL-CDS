'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Brain, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LoadingProgressProps {
  isVisible: boolean;
  currentStep: string;
  progress: number;
  estimatedTime?: number;
  onCancel?: () => void;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({
  isVisible,
  currentStep,
  progress,
  estimatedTime,
  onCancel
}) => {
  const t = useTranslations()
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isVisible) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      setTimeElapsed(0);
    }

    return () => clearInterval(interval);
  }, [isVisible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepIcon = (step: string) => {
    switch (step.toLowerCase()) {
      case 'uploading':
        return <FileText className="w-5 h-5" />;
      case 'processing':
        return <Brain className="w-5 h-5" />;
      case 'generating':
        return <Sparkles className="w-5 h-5" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStepColor = (step: string) => {
    switch (step.toLowerCase()) {
      case 'uploading':
        return 'text-blue-500';
      case 'processing':
        return 'text-purple-500';
      case 'generating':
        return 'text-green-500';
      case 'complete':
        return 'text-green-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStepDescription = (step: string) => {
    switch (step.toLowerCase()) {
      case 'uploading':
        return t('loading.uploading');
      case 'processing':
        return t('loading.processing');
      case 'generating':
        return t('loading.generating');
      case 'complete':
        return t('loading.complete');
      default:
        return t('loading.processing');
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="w-8 h-8 text-white" />
              </motion.div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('loading.title')}</h3>
            <p className="text-gray-600">{t('loading.pleaseWait')}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{t('loading.progress')}</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full relative"
              >
                <motion.div
                  animate={{ x: [0, 100, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-white/30 rounded-full"
                />
              </motion.div>
            </div>
          </div>

          {/* Current Step */}
          <div className="mb-6">
            <div className={`flex items-center space-x-3 p-4 bg-gray-50 rounded-lg ${getStepColor(currentStep)}`}>
              {getStepIcon(currentStep)}
              <div className="flex-1">
                <p className="font-medium capitalize">{currentStep}</p>
                <p className="text-sm text-gray-600">{getStepDescription(currentStep)}</p>
              </div>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{t('loading.timeElapsed')}: {formatTime(timeElapsed)}</span>
            </div>
            {estimatedTime && (
              <div>
                <span>{t('loading.estimated')}: {formatTime(estimatedTime)}</span>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-2">💡 {t('loading.tip')}</h4>
            <p className="text-sm text-blue-700">
              {t('loading.tipDescription')}
            </p>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="text-center">
              <button
                onClick={onCancel}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                {t('loading.cancel')}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingProgress;

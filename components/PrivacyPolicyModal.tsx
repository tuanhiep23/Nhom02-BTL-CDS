'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, Eye, Database, Users, FileText, Brain } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const sections = [
    {
      id: 'overview',
      title: 'Tổng quan',
      icon: Shield,
      content: [
        'Chính sách bảo mật này mô tả cách nền tảng AI Learning Platform thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.',
        'Chúng tôi cam kết bảo vệ quyền riêng tư và thông tin cá nhân của người dùng theo các tiêu chuẩn bảo mật cao nhất.',
        'Việc sử dụng nền tảng này đồng nghĩa với việc bạn đồng ý với chính sách bảo mật này.'
      ]
    },
    {
      id: 'data-collection',
      title: 'Thu thập thông tin',
      icon: Database,
      content: [
        'Thông tin tài khoản: Tên, email, tên đăng nhập khi đăng ký',
        'Tài liệu học tập: File PDF, DOCX, TXT bạn upload để xử lý',
        'Dữ liệu sử dụng: Lịch sử học tập, flashcard đã tạo, tóm tắt bài giảng',
        'Thông tin kỹ thuật: IP address, browser type, device information',
        'Cookies: Để cải thiện trải nghiệm người dùng và ghi nhớ cài đặt'
      ]
    },
    {
      id: 'data-usage',
      title: 'Sử dụng thông tin',
      icon: Brain,
      content: [
        'Xử lý tài liệu học tập bằng AI để tạo tóm tắt và flashcard',
        'Cung cấp dịch vụ học tập cá nhân hóa',
        'Cải thiện chất lượng AI và thuật toán xử lý',
        'Gửi thông báo về tiến độ học tập (nếu được cho phép)',
        'Hỗ trợ kỹ thuật và giải quyết vấn đề'
      ]
    },
    {
      id: 'data-protection',
      title: 'Bảo vệ dữ liệu',
      icon: Lock,
      content: [
        'Mã hóa SSL/TLS cho tất cả dữ liệu truyền tải',
        'Lưu trữ an toàn trên server được bảo vệ',
        'Kiểm soát truy cập nghiêm ngặt',
        'Sao lưu dữ liệu định kỳ',
        'Tuân thủ các tiêu chuẩn bảo mật quốc tế'
      ]
    },
    {
      id: 'data-sharing',
      title: 'Chia sẻ thông tin',
      icon: Users,
      content: [
        'Không bán, cho thuê hoặc chia sẻ thông tin cá nhân với bên thứ ba',
        'Chỉ chia sẻ khi có yêu cầu pháp lý hợp lệ',
        'Có thể chia sẻ dữ liệu ẩn danh để cải thiện AI',
        'Thông tin được chia sẻ với nhà cung cấp AI (Groq) theo quy định của họ'
      ]
    },
    {
      id: 'user-rights',
      title: 'Quyền của người dùng',
      icon: Eye,
      content: [
        'Quyền truy cập: Xem thông tin cá nhân đã lưu trữ',
        'Quyền chỉnh sửa: Cập nhật thông tin tài khoản',
        'Quyền xóa: Xóa tài khoản và dữ liệu cá nhân',
        'Quyền xuất dữ liệu: Tải xuống dữ liệu cá nhân',
        'Quyền từ chối: Từ chối nhận thông báo marketing'
      ]
    },
    {
      id: 'ai-processing',
      title: 'Xử lý AI',
      icon: Brain,
      content: [
        'Tài liệu của bạn được xử lý bởi AI Groq để tạo nội dung học tập',
        'Dữ liệu được mã hóa trong quá trình xử lý',
        'Không lưu trữ nội dung gốc sau khi xử lý xong',
        'Chỉ sử dụng cho mục đích học tập, không phân tích hành vi',
        'Có thể sử dụng dữ liệu ẩn danh để cải thiện thuật toán'
      ]
    },
    {
      id: 'retention',
      title: 'Lưu trữ dữ liệu',
      icon: Database,
      content: [
        'Thông tin tài khoản: Lưu trữ cho đến khi bạn xóa tài khoản',
        'Tài liệu đã xử lý: Lưu trữ trong 30 ngày sau khi xử lý',
        'Dữ liệu học tập: Lưu trữ cho đến khi bạn xóa',
        'Logs hệ thống: Lưu trữ tối đa 90 ngày',
        'Tự động xóa dữ liệu không cần thiết'
      ]
    },
    {
      id: 'cookies',
      title: 'Cookies và Tracking',
      icon: FileText,
      content: [
        'Cookies cần thiết: Đăng nhập, cài đặt, bảo mật',
        'Cookies phân tích: Cải thiện trải nghiệm người dùng',
        'Cookies tùy chọn: Ghi nhớ sở thích, dark mode',
        'Không sử dụng tracking quảng cáo',
        'Có thể tắt cookies trong cài đặt trình duyệt'
      ]
    },
    {
      id: 'security',
      title: 'Bảo mật',
      icon: Shield,
      content: [
        'Mã hóa đầu cuối cho tất cả dữ liệu nhạy cảm',
        'Xác thực hai yếu tố (2FA) khi cần thiết',
        'Giám sát bảo mật 24/7',
        'Cập nhật bảo mật thường xuyên',
        'Đào tạo nhân viên về bảo mật dữ liệu'
      ]
    },
    {
      id: 'children',
      title: 'Bảo vệ trẻ em',
      icon: Users,
      content: [
        'Không thu thập thông tin từ trẻ em dưới 13 tuổi',
        'Yêu cầu sự đồng ý của phụ huynh cho trẻ em 13-18 tuổi',
        'Giám sát nội dung phù hợp với lứa tuổi',
        'Công cụ kiểm soát cho phụ huynh',
        'Báo cáo nội dung không phù hợp'
      ]
    },
    {
      id: 'changes',
      title: 'Thay đổi chính sách',
      icon: FileText,
      content: [
        'Thông báo trước 30 ngày khi có thay đổi lớn',
        'Cập nhật ngày hiệu lực trong chính sách',
        'Tiếp tục sử dụng đồng nghĩa với việc chấp nhận thay đổi',
        'Có thể từ chối thay đổi bằng cách xóa tài khoản',
        'Lưu trữ phiên bản cũ để tham khảo'
      ]
    },
    {
      id: 'contact',
      title: 'Liên hệ',
      icon: Users,
      content: [
        'Email: privacy@ailearningplatform.com',
        'Điện thoại: +84 123 456 789',
        'Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM',
        'Thời gian phản hồi: 24-48 giờ',
        'Khiếu nại về bảo mật: security@ailearningplatform.com'
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Chính sách bảo mật</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 15/12/2024</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-8">
                {/* Introduction */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <strong>Lưu ý quan trọng:</strong> Chính sách này áp dụng cho nền tảng AI Learning Platform. 
                    Việc sử dụng dịch vụ của chúng tôi đồng nghĩa với việc bạn đã đọc, hiểu và đồng ý với chính sách này.
                  </p>
                </div>

                {/* Sections */}
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          {section.title}
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {section.content.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Phiên bản: 1.0 | Ngày hiệu lực: 15/12/2024
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        © 2024 AI Learning Platform. Tất cả quyền được bảo lưu.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      Đã hiểu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PrivacyPolicyModal;

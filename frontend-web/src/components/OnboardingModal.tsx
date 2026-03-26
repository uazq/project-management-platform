import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiHome, FiFolder, FiMessageSquare, FiUsers } from 'react-icons/fi';

interface OnboardingModalProps {
  onClose: () => void;
}

const OnboardingModal = ({ onClose }: OnboardingModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t('onboarding.welcome'),
      description: t('onboarding.welcomeDesc'),
      icon: <FiHome size={48} className="text-primary-500" />,
    },
    {
      title: t('onboarding.projects'),
      description: t('onboarding.projectsDesc'),
      icon: <FiFolder size={48} className="text-primary-500" />,
    },
    {
      title: t('onboarding.tasks'),
      description: t('onboarding.tasksDesc'),
      icon: <FiMessageSquare size={48} className="text-primary-500" />,
    },
    {
      title: t('onboarding.team'),
      description: t('onboarding.teamDesc'),
      icon: <FiUsers size={48} className="text-primary-500" />,
    },
  ];

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
        >
          <FiX size={20} />
        </button>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">{steps[step].icon}</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {steps[step].title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {steps[step].description}
          </p>
        </div>
        <div className="flex justify-between gap-2">
          {step > 0 && (
            <button
              onClick={prev}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
            >
              {t('common.back')}
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 btn-primary"
          >
            {step === steps.length - 1 ? t('common.getStarted') : t('common.next')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
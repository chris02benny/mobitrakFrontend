import React from 'react';
import { Check } from 'lucide-react';

const StepProgress = ({ currentStep, steps }) => {
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = currentStep > stepNumber;
                    const isCurrent = currentStep === stepNumber;

                    return (
                        <React.Fragment key={stepNumber}>
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isCurrent
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {isCompleted ? <Check size={16} /> : stepNumber}
                                </div>
                                <div className={`mt-1.5 text-xs font-medium ${isCurrent ? 'text-amber-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                    {step}
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 -mt-7 transition-all ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                    }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default StepProgress;

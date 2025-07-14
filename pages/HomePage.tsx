
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, CalendarIcon, MapPinIcon, HomeIcon } from '../constants';
import PageHeader from '../components/common/PageHeader';

const HomePage: React.FC = () => {
  const features = [
    {
      path: '/memory-log',
      title: 'Memory Log',
      description: 'Keep track of loved ones and daily thoughts.',
      icon: <BookOpenIcon className="w-12 h-12 text-sky-600" />,
    },
    {
      path: '/activity-planner',
      title: 'Activity Planner',
      description: 'Schedule your daily activities with reminders.',
      icon: <CalendarIcon className="w-12 h-12 text-sky-600" />,
    },
    {
      path: '/location',
      title: 'Location Services',
      description: 'Get help with navigation and stay safe.',
      icon: <MapPinIcon className="w-12 h-12 text-sky-600" />,
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Welcome to MemoryCare" subtitle="Your personal assistant for daily living." icon={<HomeIcon className="w-10 h-10" />} />
      
      <div className="text-center mb-12">
        <p className="text-xl text-slate-700">
          This application is designed to help you manage your day, remember important information, and stay connected.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className="block bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-sky-100 rounded-full mb-6">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-semibold text-sky-700 mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 p-6 bg-sky-100 rounded-lg text-sky-800">
        <h4 className="text-xl font-semibold mb-2">A Gentle Reminder</h4>
        <p>
          Take each day one step at a time. We are here to support you. If you need help, please reach out to a caregiver or family member.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
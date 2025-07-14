
import React, { useState, useEffect, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Activity } from '../types';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { PlusIcon, TrashIcon, CalendarIcon, SpeakerWaveIcon } from '../constants';
import useTextToSpeech from '../hooks/useTextToSpeech';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';

const AddActivityForm: React.FC<{ onAddActivity: (activity: Omit<Activity, 'id'>) => void; onClose: () => void }> = ({ onAddActivity, onClose }) => {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !time) {
        alert("Activity name and time are required.");
        return;
    }
    onAddActivity({ name, time, description, isRecurring });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="activityName" className="block text-lg font-medium text-slate-700">Activity Name</label>
        <input type="text" id="activityName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg" />
      </div>
      <div>
        <label htmlFor="activityTime" className="block text-lg font-medium text-slate-700">Time (HH:MM)</label>
        <input type="time" id="activityTime" value={time} onChange={(e) => setTime(e.target.value)} required className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg" />
      </div>
      <div>
        <label htmlFor="activityDescription" className="block text-lg font-medium text-slate-700">Description (Optional)</label>
        <textarea id="activityDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg"></textarea>
      </div>
      <div className="flex items-center">
        <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-5 w-5 text-sky-600 border-slate-300 rounded focus:ring-sky-500" />
        <label htmlFor="isRecurring" className="ml-2 block text-lg text-slate-700">Recurring Activity</label>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} size="lg">Cancel</Button>
        <Button type="submit" variant="primary" size="lg">Add Activity</Button>
      </div>
    </form>
  );
};

const ActivityItem: React.FC<{ activity: Activity; onDelete: (id: string) => void; onRemind: (activity: Activity) => void }> = ({ activity, onDelete, onRemind }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
      <div className="flex-1">
        <h4 className="text-2xl font-semibold text-sky-700">{activity.name}</h4>
        <p className="text-sky-600 text-xl">{activity.time}</p>
        {activity.description && <p className="text-slate-500 mt-1">{activity.description}</p>}
        {activity.isRecurring && <p className="text-sm text-blue-500 mt-1">Recurring</p>}
      </div>
      <div className="flex space-x-3">
        <Button onClick={() => onRemind(activity)} variant="ghost" size="md" leftIcon={<SpeakerWaveIcon className="w-5 h-5"/>}>Remind</Button>
        <Button onClick={() => onDelete(activity.id)} variant="danger" size="md" leftIcon={<TrashIcon className="w-5 h-5"/>}>Delete</Button>
      </div>
    </div>
  );
};

const ActivityPlannerPage: React.FC = () => {
  const [activities, setActivities] = useLocalStorage<Activity[]>('activities', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const { speak, isSupported: ttsSupported, error: ttsError } = useTextToSpeech();

  const handleAddActivity = (activityData: Omit<Activity, 'id'>) => {
    const newActivity: Activity = { ...activityData, id: Date.now().toString() };
    setActivities((prev) => [...prev, newActivity].sort((a,b) => a.time.localeCompare(b.time)));
    setNotification({ message: `Activity "${newActivity.name}" added.`, type: 'success'});
  };

  const handleDeleteActivity = (id: string) => {
    if (window.confirm("Are you sure you want to delete this activity?")) {
      setActivities((prev) => prev.filter(act => act.id !== id));
      setNotification({ message: 'Activity deleted.', type: 'info'});
    }
  };

  const handleRemind = useCallback((activity: Activity) => {
    if (ttsSupported) {
      speak(`Reminder: It's time for ${activity.name} at ${activity.time}. ${activity.description || ''}`);
      setNotification({ message: `Reminder for "${activity.name}" sent.`, type: 'info'});
    } else {
      alert(`Reminder: It's time for ${activity.name} at ${activity.time}. ${activity.description || ''}`);
      setNotification({ message: 'Text-to-speech not supported. Showing alert instead.', type: 'info'});
    }
  }, [ttsSupported, speak, setNotification]);


  // Effect for timed reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      activities.forEach(activity => {
        if (activity.time === currentTime) {
          const lastReminderKey = `lastReminder_${activity.id}`;
          const lastReminderTime = localStorage.getItem(lastReminderKey);
          if (lastReminderTime !== currentTime) {
            handleRemind(activity);
            localStorage.setItem(lastReminderKey, currentTime);
          }
        }
      });
    };

    const intervalId = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [activities, handleRemind]);

  return (
    <div className="space-y-12 animate-fadeIn">
      <PageHeader title="Daily Activity Planner" subtitle="Schedule your activities and get timely reminders." icon={<CalendarIcon className="w-10 h-10" />} />
      
      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => {}} />}


      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusIcon className="w-6 h-6"/>} size="lg">Add Activity</Button>
      </div>

      {activities.length === 0 ? (
        <p className="text-slate-500 text-lg text-center py-8 bg-white rounded-lg shadow">No activities scheduled. Click "Add Activity" to plan your day.</p>
      ) : (
        <div className="space-y-6">
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} onDelete={handleDeleteActivity} onRemind={handleRemind} />
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Activity">
        <AddActivityForm onAddActivity={handleAddActivity} onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default ActivityPlannerPage;

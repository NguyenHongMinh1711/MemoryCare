
import React, { useState, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Person, JournalEntry } from '../types';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { PlusIcon, TrashIcon, MicrophoneIcon, SpeakerWaveIcon, BookOpenIcon, UserCircleIcon } from '../constants';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';

const PersonCard: React.FC<{ person: Person; onDelete: (id: string) => void; onSpeak: (text: string) => void }> = ({ person, onDelete, onSpeak }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
      <img src={person.photoUrl || `https://picsum.photos/seed/${person.id}/150/150`} alt={person.name} className="w-32 h-32 rounded-full object-cover border-4 border-sky-200" />
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-2xl font-semibold text-sky-700">{person.name}</h3>
        <p className="text-slate-600 text-lg">{person.relationship}</p>
        <p className="text-slate-500 mt-2">{person.keyInfo}</p>
        {person.voiceNoteUrl && (
          <audio controls src={person.voiceNoteUrl} className="mt-2 w-full">
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
      <div className="flex flex-col space-y-2">
        <Button onClick={() => onSpeak(`This is ${person.name}, who is your ${person.relationship}. ${person.keyInfo}`)} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5"/>}>
          Recall
        </Button>
        <Button onClick={() => onDelete(person.id)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-5 h-5"/>}>
          Delete
        </Button>
      </div>
    </div>
  );
};

const AddPersonForm: React.FC<{ onAddPerson: (person: Omit<Person, 'id'>) => void; onClose: () => void }> = ({ onAddPerson, onClose }) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [keyInfo, setKeyInfo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !relationship) {
        alert("Name and relationship are required.");
        return;
    }
    onAddPerson({ name, relationship, photoUrl, keyInfo });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-lg font-medium text-slate-700">Name</label>
        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg" />
      </div>
      <div>
        <label htmlFor="relationship" className="block text-lg font-medium text-slate-700">Relationship</label>
        <input type="text" id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} required className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg" />
      </div>
      <div>
        <label htmlFor="photoUrl" className="block text-lg font-medium text-slate-700">Photo URL (e.g., https://picsum.photos/200)</label>
        <input type="url" id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg" />
      </div>
      <div>
        <label htmlFor="keyInfo" className="block text-lg font-medium text-slate-700">Key Information</label>
        <textarea id="keyInfo" value={keyInfo} onChange={(e) => setKeyInfo(e.target.value)} rows={3} className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-lg"></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} size="lg">Cancel</Button>
        <Button type="submit" variant="primary" size="lg">Add Person</Button>
      </div>
    </form>
  );
};


const MemoryLogPage: React.FC = () => {
  const [people, setPeople] = useLocalStorage<Person[]>('people', []);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>('journalEntries', []);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const { isListening, transcript, startListening, stopListening, error: speechError, isSupported: speechSupported, resetTranscript } = useSpeechRecognition();
  const { speak, isSpeaking, error: ttsError, isSupported: ttsSupported } = useTextToSpeech();

  const handleAddPerson = (personData: Omit<Person, 'id'>) => {
    const newPerson: Person = { ...personData, id: Date.now().toString() };
    setPeople((prev) => [...prev, newPerson]);
    setNotification({ message: `${newPerson.name} added successfully!`, type: 'success'});
  };

  const handleDeletePerson = (id: string) => {
    if (window.confirm("Are you sure you want to delete this person?")) {
      setPeople((prev) => prev.filter(p => p.id !== id));
      setNotification({ message: 'Person deleted.', type: 'info'});
    }
  };

  const handleAddJournalEntry = useCallback(() => {
    if (transcript.trim()) {
      const newEntry: JournalEntry = { id: Date.now().toString(), timestamp: Date.now(), text: transcript.trim() };
      setJournalEntries((prev) => [newEntry, ...prev]); // Add to beginning
      resetTranscript();
      setNotification({ message: 'Journal entry saved!', type: 'success'});
    } else {
        setNotification({ message: 'No speech detected to save.', type: 'info'});
    }
  }, [transcript, setJournalEntries, resetTranscript]);

  const handleDeleteJournalEntry = (id: string) => {
     if (window.confirm("Are you sure you want to delete this journal entry?")) {
        setJournalEntries((prev) => prev.filter(entry => entry.id !== id));
        setNotification({ message: 'Journal entry deleted.', type: 'info'});
     }
  };
  
  const handleSpeak = (textToSpeak: string) => {
    if (ttsSupported) {
      speak(textToSpeak);
    } else {
      setNotification({ message: "Text-to-speech is not supported on this device.", type: 'error'});
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn">
      <PageHeader title="Memory Log" subtitle="Remember important people and record your daily thoughts." icon={<BookOpenIcon className="w-10 h-10" />} />

      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {speechError && <NotificationBanner message={`Speech recognition error: ${speechError}`} type="error" onDismiss={() => { /* Manually clear error if needed */ }} />}
      {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => { /* Manually clear error if needed */ }} />}


      {/* People Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-3xl font-semibold text-sky-700 flex items-center"><UserCircleIcon className="w-8 h-8 mr-2 text-sky-600"/>People</h3>
          <Button onClick={() => setIsPersonModalOpen(true)} leftIcon={<PlusIcon className="w-6 h-6"/>} size="lg">Add Person</Button>
        </div>
        {people.length === 0 ? (
          <p className="text-slate-500 text-lg text-center py-8 bg-white rounded-lg shadow">No people added yet. Click "Add Person" to get started.</p>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {people.map(person => (
              <PersonCard key={person.id} person={person} onDelete={handleDeletePerson} onSpeak={handleSpeak} />
            ))}
          </div>
        )}
      </section>

      {/* Daily Journal Section */}
      <section>
        <h3 className="text-3xl font-semibold text-sky-700 mb-6">Daily Journal</h3>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-slate-600 mb-4 text-lg">Record your thoughts, feelings, or activities for the day using your voice.</p>
          {!speechSupported && <p className="text-red-500">Speech recognition is not supported in your browser.</p>}
          {speechSupported && (
            <div className="space-y-4">
              <textarea
                value={transcript}
                onChange={(e) => {/* Transcript is usually read-only from hook, direct edit might be confusing here. Consider a different state if manual edit is desired.*/}}
                placeholder={isListening ? "Listening..." : "Your recorded thoughts will appear here..."}
                rows={4}
                className="w-full p-3 border border-slate-300 rounded-lg text-lg focus:ring-sky-500 focus:border-sky-500"
                readOnly={isListening}
              />
              <div className="flex space-x-3">
                <Button
                  onClick={isListening ? stopListening : startListening}
                  variant={isListening ? "danger" : "primary"}
                  leftIcon={<MicrophoneIcon className="w-6 h-6"/>}
                  disabled={!speechSupported || isSpeaking}
                  size="lg"
                >
                  {isListening ? 'Stop Recording' : 'Start Recording'}
                </Button>
                <Button onClick={handleAddJournalEntry} disabled={!transcript.trim() || isListening} size="lg" variant="success">Save Entry</Button>
              </div>
            </div>
          )}
        </div>

        {journalEntries.length > 0 && (
          <div className="mt-8">
            <h4 className="text-2xl font-semibold text-sky-600 mb-4">Past Entries:</h4>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {journalEntries.map(entry => (
                <div key={entry.id} className="bg-sky-50 p-4 rounded-lg shadow">
                  <p className="text-xs text-slate-500 mb-1">{new Date(entry.timestamp).toLocaleString()}</p>
                  <p className="text-slate-700 text-lg">{entry.text}</p>
                  <div className="mt-2 flex space-x-2">
                    <Button onClick={() => handleSpeak(entry.text)} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-4 h-4"/>}>Read Aloud</Button>
                    <Button onClick={() => handleDeleteJournalEntry(entry.id)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-4 h-4"/>}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} title="Add New Person">
        <AddPersonForm onAddPerson={handleAddPerson} onClose={() => setIsPersonModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default MemoryLogPage;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api-client';

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  type: 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';
  category: 'LESSON' | 'HOMEWORK' | 'RESOURCE';
  mediaUrl?: string;
  groupId: string;
}

interface Group {
  _id: string;
  name: string;
}

export function TeacherAssignments() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO'>('TEXT');
  const [assignmentCategory, setAssignmentCategory] = useState<'LESSON' | 'HOMEWORK' | 'RESOURCE'>('LESSON');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['teacher', 'groups'],
    queryFn: () => apiFetch<Group[]>('/api/v1/groups/my'),
  });

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['teacher', 'assignments'],
    queryFn: () => apiFetch<Assignment[]>('/api/v1/assignments'),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      type: string;
      category: string;
      mediaUrl?: string;
      groupId: string;
    }) =>
      apiFetch('/api/v1/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setContentType('TEXT');
      setAssignmentCategory('LESSON');
      setSelectedGroup('');
      setMediaUrl('');
      alert('Material muvaffaqiyatli saqlandi!');
    },
    onError: (error: any) => {
      alert(error?.message || 'Saqlashda xatolik yuz berdi!');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedGroup) {
      alert('Iltimos, sarlavha va guruhni tanlang!');
      return;
    }

    createMutation.mutate({
      title,
      description: description.trim() || undefined,
      type: contentType,
      category: assignmentCategory,
      mediaUrl: mediaUrl.trim() || undefined,
      groupId: selectedGroup,
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">O'quv materiallari va vazifalar</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? 'Bekor qilish' : "+ Yangi material qo'shish"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Yangi material yaratish</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Sarlavha</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              placeholder="Material sarlavhasi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              placeholder="Batafsil ma'lumot..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kontent formati (Type)</label>
              <select
                value={contentType}
                onChange={(e: any) => setContentType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              >
                <option value="TEXT">Matn</option>
                <option value="IMAGE">Rasm</option>
                <option value="PDF">PDF</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Material toifasi (Category)</label>
              <select
                value={assignmentCategory}
                onChange={(e: any) => setAssignmentCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              >
                <option value="LESSON">Dars</option>
                <option value="HOMEWORK">Uy vazifasi</option>
                <option value="RESOURCE">Resurs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Guruhni tanlang</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            >
              <option value="">Guruhni tanlang...</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Media havola (Media URL - ixtiyoriy)</label>
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              placeholder="https://..."
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            {createMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Mavjud materiallar</h2>
        {isLoading ? (
          <p>Yuklanmoqda...</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-500">Hozircha materiallar mavjud emas.</p>
        ) : (
          <div className="space-y-4">
            {assignments.map((item) => (
              <div key={item._id} className="border p-4 rounded-lg flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{item.type}</span>
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{item.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
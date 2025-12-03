'use client';

import { useState, useEffect } from 'react';

interface TopicInfo {
  threadId: number | null;
  name: string;
  purpose: string;
  isPinned: boolean;
  lastUsed: number;
}

interface TopicsData {
  chatId: number;
  topics: TopicInfo[];
  alertsThread?: number;
  errorsThread?: number;
  tradesThread?: number;
}

const PURPOSES = ['alerts', 'errors', 'trades', 'commands', 'general', 'golden', 'pnl', 'system'];

export default function TelegramTopics() {
  const [data, setData] = useState<TopicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  // New topic form
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicPurpose, setNewTopicPurpose] = useState('alerts');
  const [creatingTopic, setCreatingTopic] = useState(false);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/telegram?action=topics');
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setError(null);
      } else {
        setError(json.description || 'Failed to fetch topics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const syncTopics = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'syncTopicsFromTelegram' }),
      });
      const json = await res.json();
      if (json.ok) {
        setData(prev => (prev ? { ...prev, topics: json.topics } : null));
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const pinTopic = async (threadId: number | null, purpose: string) => {
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pinTopic', threadId, purpose }),
      });
      const json = await res.json();
      if (json.ok) {
        fetchTopics();
      }
    } catch (err) {
      console.error('Pin failed:', err);
    }
  };

  const unpinTopic = async (threadId: number | null) => {
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpinTopic', threadId }),
      });
      const json = await res.json();
      if (json.ok) {
        fetchTopics();
      }
    } catch (err) {
      console.error('Unpin failed:', err);
    }
  };

  const testAlert = async () => {
    setTestingAlert(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testAlert' }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert('Test failed: ' + json.message);
      }
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTestingAlert(false);
    }
  };

  const createTopic = async () => {
    if (!newTopicName.trim()) return;
    setCreatingTopic(true);
    try {
      // First create the topic in Telegram
      const createRes = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createTopic', name: newTopicName }),
      });
      const createJson = await createRes.json();

      if (createJson.ok && createJson.result) {
        const threadId = createJson.result.message_thread_id;
        // Register and pin it
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registerTopic',
            threadId,
            name: newTopicName,
            purpose: newTopicPurpose,
          }),
        });

        if (newTopicPurpose !== 'general') {
          await pinTopic(threadId, newTopicPurpose);
        }

        setNewTopicName('');
        fetchTopics();
      } else {
        alert('Failed to create topic: ' + (createJson.description || 'Unknown error'));
      }
    } catch (err) {
      console.error('Create topic failed:', err);
    } finally {
      setCreatingTopic(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="animate-pulse">Loading topics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="text-red-400">Error: {error}</div>
        <button
          onClick={fetchTopics}
          className="mt-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Telegram Topics</h2>
          <p className="text-zinc-500 text-sm">
            Chat ID: <code className="text-zinc-400">{data?.chatId}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncTopics}
            disabled={syncing}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync from Telegram'}
          </button>
          <button
            onClick={fetchTopics}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Pinned Routes Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Alerts</div>
          <div className="text-lg font-mono mt-1">
            {data?.alertsThread !== undefined ? (
              <span className="text-green-400">Thread {data.alertsThread}</span>
            ) : (
              <span className="text-zinc-600">Not set</span>
            )}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Errors</div>
          <div className="text-lg font-mono mt-1">
            {data?.errorsThread !== undefined ? (
              <span className="text-red-400">Thread {data.errorsThread}</span>
            ) : (
              <span className="text-zinc-600">Not set</span>
            )}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Trades</div>
          <div className="text-lg font-mono mt-1">
            {data?.tradesThread !== undefined ? (
              <span className="text-blue-400">Thread {data.tradesThread}</span>
            ) : (
              <span className="text-zinc-600">Not set</span>
            )}
          </div>
        </div>
      </div>

      {/* Test Alert Button */}
      <div className="flex gap-2">
        <button
          onClick={testAlert}
          disabled={testingAlert || !data?.alertsThread}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-sm font-medium"
        >
          {testingAlert ? 'Sending...' : 'Send Test Alert'}
        </button>
        {!data?.alertsThread && (
          <span className="text-zinc-500 text-sm self-center">Pin a topic to alerts first</span>
        )}
      </div>

      {/* Topics Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Topic Name</th>
              <th className="text-left px-4 py-2 font-medium">Thread ID</th>
              <th className="text-left px-4 py-2 font-medium">Purpose</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data?.topics.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No topics registered yet. Send a message in any Telegram topic to register it, or
                  create a new one below.
                </td>
              </tr>
            ) : (
              data?.topics.map((topic, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium">{topic.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-zinc-400">
                      {topic.threadId === null ? 'null' : topic.threadId}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={topic.purpose}
                      onChange={e => {
                        if (e.target.value !== topic.purpose) {
                          pinTopic(topic.threadId, e.target.value);
                        }
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                    >
                      {PURPOSES.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {topic.isPinned ? (
                      <span className="inline-flex items-center gap-1 text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Pinned
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {topic.isPinned ? (
                      <button
                        onClick={() => unpinTopic(topic.threadId)}
                        className="text-zinc-400 hover:text-white text-xs"
                      >
                        Unpin
                      </button>
                    ) : (
                      <button
                        onClick={() => pinTopic(topic.threadId, topic.purpose)}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        Pin for {topic.purpose}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create New Topic */}
      <div className="border border-zinc-800 rounded-lg p-4">
        <h3 className="font-medium mb-3">Create New Topic</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            placeholder="Topic name (e.g., Alerts)"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
          />
          <select
            value={newTopicPurpose}
            onChange={e => setNewTopicPurpose(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
          >
            {PURPOSES.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            onClick={createTopic}
            disabled={creatingTopic || !newTopicName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-sm font-medium"
          >
            {creatingTopic ? 'Creating...' : 'Create & Pin'}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-zinc-500 space-y-1">
        <p>
          <strong>How it works:</strong>
        </p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Topics are auto-registered when users send messages in them</li>
          <li>Pin a topic to a purpose (alerts, errors, trades) to route messages there</li>
          <li>Only one topic can be pinned per purpose at a time</li>
          <li>Use "Sync from Telegram" to fetch topics from recent messages</li>
        </ul>
      </div>
    </div>
  );
}

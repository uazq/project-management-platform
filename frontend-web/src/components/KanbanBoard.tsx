import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';
import { FiClock, FiAlertCircle, FiCheckCircle, FiPlay } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: number, newStatus: string) => Promise<void>;
}

const statusColumns = [
  { id: 'not_started', title: 'task.not_started', color: 'bg-gray-100 dark:bg-gray-800', icon: FiClock },
  { id: 'in_progress', title: 'task.in_progress', color: 'bg-blue-50 dark:bg-blue-900/30', icon: FiPlay },
  { id: 'completed', title: 'task.completed', color: 'bg-green-50 dark:bg-green-900/30', icon: FiCheckCircle },
  { id: 'overdue', title: 'task.overdue', color: 'bg-red-50 dark:bg-red-900/30', icon: FiAlertCircle },
];

const TaskCard = ({ task }: { task: Task }) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    high: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
    medium: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30',
    low: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-2 cursor-grab active:cursor-grabbing border border-gray-200 dark:border-gray-700 hover:shadow-md transition"
    >
      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{task.title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
      <div className="flex justify-between items-center text-xs">
        <span className={`px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>
          {t(`task.${task.priority}`)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">{task.assignee?.fullName || t('task.unassigned')}</span>
      </div>
      {task.dueDate && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <FiClock size={12} />
          {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

const KanbanBoard = ({ tasks, onTaskStatusChange }: KanbanBoardProps) => {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksByStatus = statusColumns.reduce((acc, col) => {
    acc[col.id] = tasks.filter(task => task.status === col.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  const taskId = active.id as number;
  const overId = String(over.id); // تحويل إلى string هنا
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  let newStatus: string | null = null;

  if (overId.startsWith('column-')) {
    newStatus = overId.replace('column-', '');
  } else {
    const overTask = tasks.find(t => t.id === parseInt(overId));
    if (overTask) newStatus = overTask.status;
  }

  if (newStatus && task.status !== newStatus) {
    try {
      await onTaskStatusChange(taskId, newStatus);
    } catch {
      toast.error(t('task.statusUpdateError'));
    }
  }
};
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusColumns.map((column) => (
          <div key={column.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${column.color}`}>
              <column.icon className="text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t(column.title)}</h3>
              <span className="mr-auto bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {tasksByStatus[column.id]?.length || 0}
              </span>
            </div>
            <SortableContext
              id={`column-${column.id}`}
              items={tasksByStatus[column.id]?.map(t => t.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[200px]">
                {tasksByStatus[column.id]?.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {tasksByStatus[column.id]?.length === 0 && (
                  <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    {t('common.noData')}
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;
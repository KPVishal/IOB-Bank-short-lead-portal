import Modal from './Modal.jsx';

/**
 * Lightweight confirmation modal — yes/no on a single question.
 * Used for activate/deactivate toggles on users and branches.
 */
export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger', // 'danger' (red) | 'primary' (purple)
  busy = false,
  onConfirm,
  onClose,
}) {
  const confirmClasses = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-bp-purple hover:bg-bp-deep text-white';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-action rounded disabled:opacity-60 ${confirmClasses}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
    </Modal>
  );
}

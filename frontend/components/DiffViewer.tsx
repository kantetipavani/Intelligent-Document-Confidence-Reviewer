type Props = {
  diff: any;
};

export default function DiffViewer({ diff }: Props) {
  return (
    <div>
      <h3>Changes</h3>

      {diff ? (
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {typeof diff === 'string'
            ? diff
            : JSON.stringify(diff, null, 2)}
        </pre>
      ) : (
        <p>No changes available</p>
      )}
    </div>
  );
}


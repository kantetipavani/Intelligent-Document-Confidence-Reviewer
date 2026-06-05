type Props = {
  versions: any[];
};

export default function VersionHistory({ versions }: Props) {
  return (
    <div>
      <h3>Version History</h3>

      <ul>
        {(versions ?? []).map((v, idx) => (
          <li key={idx}>
            v{v.version_number} ({v.action})
          </li>
        ))}
      </ul>
    </div>
  );
}


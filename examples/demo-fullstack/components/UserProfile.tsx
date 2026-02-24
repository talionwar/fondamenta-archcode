import { Avatar } from './ui/Avatar';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export function UserProfile() {
  return (
    <Card title="Profile">
      <Avatar src="/user.png" />
      <Button label="Edit Profile" />
    </Card>
  );
}

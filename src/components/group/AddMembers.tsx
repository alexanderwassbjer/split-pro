import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { InformationCircleIcon, UserPlusIcon } from '@heroicons/react/24/solid';
import { api } from '~/utils/api';
import {
  AppDrawer,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from '~/components/ui/drawer';
import clsx from 'clsx';
import { UserAvatar } from '../ui/avatar';
import { type Group, type GroupUser } from '@prisma/client';
import { CheckIcon, SendIcon, UserPlus } from 'lucide-react';
import { Input } from '../ui/input';
import { z } from 'zod';
import { env } from '~/env';
import { isStorageConfigured } from '~/server/storage';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';


const AddMembers: React.FC<{
  enableSendingInvites: boolean;
  group: Group & { groupUsers: Array<GroupUser> };
  children: React.ReactNode;
}> = ({ group, children, enableSendingInvites }) => {
  const [open, setOpen] = useState(false);
  const [userIds, setUserIds] = useState<Record<number, boolean>>({});
  const [inputValue, setInputValue] = useState('');

  const friendsQuery = api.user.getFriends.useQuery();
  const addMembersMutation = api.group.addMembers.useMutation();
  const addFriendMutation = api.user.inviteFriend.useMutation();

  const utils = api.useUtils();
  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);


  const groupUserMap = group.groupUsers.reduce(
    (acc, gu) => {
      acc[gu.userId] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const filteredUsers = friendsQuery.data?.filter(
    (f) =>
      !groupUserMap[f.id] && (f.name ?? f.email)?.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function onUserSelect(userId: number) {
    setUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function onSave(userIds: Record<number, boolean>) {
    const users = [];

    for (const userId of Object.keys(userIds)) {
      if (userIds[parseInt(userId)]) {
        users.push(parseInt(userId));
      }
    }

    setInputValue('');

    if (users.length === 0) {
      return;
    }

    addMembersMutation.mutate(
      {
        groupId: group.id,
        userIds: users,
      },
      {
        onSuccess: () => {
          utils.group.getGroupDetails.invalidate({ groupId: group.id }).catch(console.error);
        },
      },
    );
    setOpen(false);
    setUserIds({});
  }

  const isEmail = z.string().email().safeParse(inputValue);

  function onAddEmailClick(invite = false) {
    if (isEmail.success) {
      addFriendMutation.mutate(
        { email: inputValue.toLowerCase(), sendInviteEmail: invite },
        {
          onSuccess: (user) => {
            onSave({ ...userIds, [user.id]: true });
          },
        },
      );
    }
  }

  return (
    <AppDrawer
      trigger={
        <div className="flex items-center justify-center gap-2 lg:w-[180px]">{children}</div>
      }
      onTriggerClick={() => setOpen(true)}
      title={t('addmembers')}
      leftAction={t('cancel')}
      actionOnClick={() => onSave(userIds)}
      className="h-[85vh]"
      shouldCloseOnAction
      actionTitle={t('save')}
      open={open}
      onClose={() => setOpen(false)}
      onOpenChange={(state) => state !== open && setOpen(state)}
    >
      <div className="">
        <Input
          className="mt-8 w-full text-lg"
          placeholder={t('addmember_placeholder')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {!isEmail.success ? (
          <p className="mt-4 text-red-500">{t('addmember_valid_mail')}</p>
        ) : (
          <div>
            {enableSendingInvites ? (
              <div className="mt-1 text-orange-600">
                Warning: Don&apos;t use send invite if it&apos;s invalid email. use add to Split Pro
                instead. Your account will be blocked if this feature is misused
              </div>
            ) : (
              <div>Note: sending invite is disabled for now because of spam</div>
            )}

            <div className="flex justify-center gap-4">
              {enableSendingInvites && (
                <Button
                  className="mt-4 w-full text-cyan-500"
                  variant="outline"
                  disabled={!isEmail.success}
                  onClick={() => onAddEmailClick(true)}
                >
                  <SendIcon className="mr-2 h-4 w-4" />
                  {isEmail.success ? t('addmember_invite_user') : t('addmember_valid_mail')}
                </Button>
              )}
              <Button
                className="mt-4 w-full text-cyan-500"
                variant="outline"
                disabled={!isEmail.success}
                onClick={() => onAddEmailClick(false)}
              >
                <UserPlusIcon className="mr-2 h-4 w-4" />
                {isEmail.success ? t('addmember_add_to_split') : t('addmember_valid_mail')}
              </Button>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-4">
          {filteredUsers?.map((friend) => (
            <Button
              variant="ghost"
              key={friend.id}
              className="flex items-center justify-between px-0 focus:text-foreground"
              onClick={() => onUserSelect(friend.id)}
            >
              <div className={clsx('flex items-center gap-2 rounded-md py-1.5')}>
                <UserAvatar user={friend} />
                <p>{friend.name ?? friend.email}</p>
              </div>
              <div>
                {userIds[friend.id] ? <CheckIcon className="h-4 w-4 text-primary" /> : null}
              </div>
            </Button>
          ))}
        </div>
      </div>
    </AppDrawer>
  );
};

export default AddMembers;

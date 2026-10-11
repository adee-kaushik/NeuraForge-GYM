'use client';

import React from 'react';
import { logoutMember } from '@/app/member/actions';

interface MemberHeaderActionsProps {
  gymCode?: string;
  phone?: string;
  memberName?: string;
}

export const MemberHeaderActions: React.FC<MemberHeaderActionsProps> = () => {
  return (
    <div className="flex items-center gap-3">
      <form action={logoutMember}>
        <button
          type="submit"
          className="text-xs font-bold text-outline hover:text-on-surface hover:underline cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          <span>Log out</span>
        </button>
      </form>
    </div>
  );
};

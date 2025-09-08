import React from 'react';

type Props = {
  team: 'purple' | 'orange';
  title: string;
};

const TeamPanel: React.FC<Props> = ({ team, title }) => {
  const color = team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500';
  return (
    <div className="panel space-y-4">
      <div
        className={`rounded-md bg-gradient-to-r ${color} px-3 py-2 text-slate-900 font-bold text-center`}
      >
        {title}
      </div>

      <section>
        <h3 className="mb-2 text-sm text-slate-300">使用禁止（BAN）</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="slot">BAN 1</div>
          <div className="slot">BAN 2</div>
          <div className="slot">BAN 3</div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm text-slate-300">使用ポケモン（PICK）</h3>
        <div className="grid grid-cols-5 gap-2">
          <div className="slot slot-lg">1</div>
          <div className="slot slot-lg">2</div>
          <div className="slot slot-lg">3</div>
          <div className="slot slot-lg">4</div>
          <div className="slot slot-lg">5</div>
        </div>
      </section>
    </div>
  );
};

export default TeamPanel;


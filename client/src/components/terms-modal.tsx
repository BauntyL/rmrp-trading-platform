import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Shield, Users, Ban, Eye } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onAccept: () => void;
}

export function TermsModal({ open, onAccept }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] bg-slate-800 border-slate-700"
      >
        <DialogHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-amber-500/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Внимание! Важная информация перед началом торговли
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 text-slate-300 leading-relaxed">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-center text-blue-200 font-medium">
                Вы находитесь на <span className="text-blue-400 font-bold">игровой торговой площадке</span>, 
                предназначенной исключительно для виртуальных сделок внутри игры и обмена между игроками. 
                <span className="text-red-400 font-bold"> Настоящая торговая деятельность запрещена.</span>
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3 text-lg">
                Просьба ознакомиться с правилами платформы и помнить следующее:
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-full flex-shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-green-400" />
                  </div>
                  <p>
                    Все сделки происходят на <span className="text-green-400 font-medium">добровольной основе</span> между пользователями 
                    и администрация площадки ответственности за убытки или конфликты сторон не несет.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-full flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <p>
                    Покупка игровых предметов и валюты возможна только <span className="text-blue-400 font-medium">внутриигровыми средствами</span> — 
                    реальные деньги использовать нельзя.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-full flex-shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-purple-400" />
                  </div>
                  <p>
                    Обмен товарами должен осуществляться согласно <span className="text-purple-400 font-medium">правилам самой игры</span> и 
                    этическим нормам сообщества игроков.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-full flex-shrink-0 mt-0.5">
                    <Eye className="h-4 w-4 text-yellow-400" />
                  </div>
                  <p>
                    Администрация регулярно проверяет активность пользователей и 
                    <span className="text-yellow-400 font-medium"> блокирует аккаунты нарушителей.</span>
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-red-500/20 rounded-full flex-shrink-0 mt-0.5">
                    <Ban className="h-4 w-4 text-red-400" />
                  </div>
                  <p>
                    Любые <span className="text-red-400 font-medium">мошеннические схемы, взлом аккаунтов</span> и 
                    использование чит-программ караются <span className="text-red-400 font-bold">баном аккаунта навсегда.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-6">
              <p className="text-slate-200 text-center font-medium">
                Используя сайт, вы подтверждаете согласие с этими условиями и берёте ответственность 
                за собственные действия во время торговли.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-6 border-t border-slate-700">
          <Button 
            onClick={onAccept}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 text-lg"
          >
            Принимаю условия и продолжаю
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
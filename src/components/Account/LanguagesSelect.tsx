import React, { useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { AppDrawer } from '../ui/drawer';
import { Check, ChevronRight, Languages } from 'lucide-react';
import { cn } from '~/lib/utils';
import { api } from '~/utils/api';
import { Button } from '../ui/button';
import Image from 'next/image';
import { env } from '~/env';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';
import { supportedLngs } from '../../i18n/config';

export const LanguagesSelect = () => {
  const [open, setOpen] = React.useState(false);

  const { t, ready, i18n } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const onSelect = async (currentValue: string) => {
    i18n.changeLanguage(currentValue);

    setOpen(false);
  };

  return (
    <AppDrawer
      trigger={
        <Button
          variant="ghost"
          className="text-md w-full justify-between px-0 hover:text-foreground/80"
        >
          <div className="flex items-center gap-4">
            <Languages className="h-5 w-5 text-blue-500" />
            <p>{t('language')}</p>
          </div>
          <ChevronRight className="h-6 w-6 text-gray-500" />
        </Button>
      }
      onTriggerClick={() => setOpen(true)}
      title={t('select_language')}
      className="h-[70vh]"
      shouldCloseOnAction
      open={open}
      onOpenChange={(openVal) => {
        if (openVal !== open) setOpen(openVal);
      }}
    >
      <div className="">
        <Command className="h-[50vh]">
          <CommandInput className="text-lg" placeholder={t('search_language')} />
          <CommandEmpty>{t('no_languages_found')}</CommandEmpty>
          <CommandGroup className="h-full overflow-auto">
            {Object.keys(supportedLngs).map((framework, index) => (
              <CommandItem
                key={framework}
                value={framework}
                onSelect={(currentValue) => onSelect(currentValue)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    framework === i18n.language ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="flex gap-2">
                  <p>{Object.values(supportedLngs)[index]}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </div>
    </AppDrawer>
  );
};

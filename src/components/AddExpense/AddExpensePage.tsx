import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { calculateParticipantSplit, type Participant, useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { UserInput } from './UserInput';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Banknote, CalendarIcon, Check, HeartHandshakeIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { SplitTypeSection } from './SplitTypeSection';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import UploadFile from './UploadFile';
import { CategoryIcons } from '../ui/categoryIcons';
import Link from 'next/link';
import { CURRENCIES } from '~/lib/currency';
import { GoCardlessTransactions } from './GoCardlessTransactions';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

export type TransactionAddInputModel = {
  date: Date;
  description: string;
  amount: string;
  currency: string;
  transactionId?: string;
};

export const AddOrEditExpensePage: React.FC<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
  expenseId?: string;
}> = ({ isStorageConfigured, enableSendingInvites, expenseId }) => {
  const [open, setOpen] = React.useState(false);
  const [transactionId, setTransactionId] = React.useState('');
  const [multipleArray, setMultipleArray] = React.useState<TransactionAddInputModel[]>([]);

  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);
  const amtStr = useAddExpenseStore((s) => s.amountStr);
  const expenseDate = useAddExpenseStore((s) => s.expenseDate);

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const categories = {
    entertainment: {
      name: t('category_entertainment'),
      items: [
        {
          games: t('category_games'),
          movies: t('category_movies'),
          music: t('category_music'),
          sports: t('category_sports'),
          other: t('category_entertainment'),
        },
      ],
    },
    food: {
      name: t('category_food'),
      items: [
        {
          diningOut: t('category_diningOut'),
          groceries: t('category_groceries'),
          liquor: t('category_liquor'),
          other: t('category_food'),
        },
      ],
    },
    home: {
      name: t('category_home'),
      items: [
        {
          electronics: t('category_electronics'),
          furniture: t('category_furniture'),
          supplies: t('category_supplies'),
          maintenance: t('category_maintenance'),
          mortgage: t('category_mortgage'),
          pets: t('category_pets'),
          rent: t('category_rent'),
          services: t('category_services'),
          other: t('category_home'),
        },
      ],
    },
    life: {
      name: t('category_life'),
      items: [
        {
          childcare: t('category_childcare'),
          clothing: t('category_clothing'),
          education: t('category_education'),
          gifts: t('category_gifts'),
          medical: t('category_medical'),
          taxes: t('category_taxes'),
          other: t('category_life'),
        },
      ],
    },
    travel: {
      name: t('category_travel'),
      items: [
        {
          bus: t('category_bus'),
          train: t('category_train'),
          car: t('category_car'),
          fuel: t('category_fuel'),
          parking: t('category_parking'),
          plane: t('category_plane'),
          taxi: t('category_taxi'),
          other: t('category_travel'),
        },
      ],
    },
    utilities: {
      name: t('category_utilities'),
      items: [
        {
          cleaning: t('category_cleaning'),
          electricity: t('category_electricity'),
          gas: t('category_gas'),
          internet: t('category_internet'),
          trash: t('category_trash'),
          phone: t('category_phone'),
          water: t('category_water'),
          other: t('category_utilities'),
        },
      ],
    },
  };

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.user.addOrEditExpense.useMutation();
  const addGroupExpenseMutation = api.group.addOrEditExpense.useMutation();
  const updateProfile = api.user.updateUserDetail.useMutation();

  const router = useRouter();

  function onUpdateAmount(amt: string) {
    const _amt = amt.replace(',', '.');
    setAmountStr(_amt);
    setAmount(Number(_amt) || 0);
  }

  const returnMutateObject = ({
    name,
    currency,
    amount,
    paidBy,
    expenseDate,
    transactionId,
    participants,
    expenseId,
  }: {
    name: string;
    currency: string;
    amount: number;
    paidBy: number;
    expenseDate?: Date;
    transactionId?: string;
    expenseId?: string;
    participants: Participant[];
  }) => {
    const { splitType, fileKey } = useAddExpenseStore.getState();

    return {
      expenseId,
      name,
      currency,
      amount,
      splitType,
      participants: participants.map((p) => ({
        userId: p.id,
        amount: p.amount ?? 0,
      })),
      paidBy,
      category,
      fileKey,
      expenseDate,
      transactionId: transactionId,
    };
  };

  async function addMultipleExpenses() {
    const { group, paidBy, splitType } = useAddExpenseStore.getState();
    if (!paidBy) {
      return;
    }

    const seen = new Set();
    const deduplicated = multipleArray.filter((item) => {
      if (seen.has(item.transactionId)) {
        return false;
      }
      seen.add(item.transactionId);
      return true;
    });

    for (const tempItem of deduplicated) {
      if (tempItem) {
        const _amt = Number(tempItem.amount.replace(',', '.')) ?? 0;

        const { participants: tempParticipants } = calculateParticipantSplit(
          _amt,
          participants,
          splitType,
          paidBy,
        );

        if (group) {
          await addGroupExpenseMutation.mutateAsync({
            ...returnMutateObject({
              name: tempItem.description,
              currency: tempItem.currency,
              amount: _amt,
              paidBy: paidBy.id,
              expenseDate: tempItem.date,
              transactionId: tempItem.transactionId,
              participants: tempParticipants,
            }),
            groupId: group.id,
          });
        } else {
          await addExpenseMutation.mutateAsync(
            returnMutateObject({
              name: tempItem.description,
              currency: tempItem.currency,
              amount: _amt,
              paidBy: paidBy.id,
              expenseDate: tempItem.date,
              transactionId: tempItem.transactionId,
              participants: tempParticipants,
            }),
          );
        }
      }
    }

    setMultipleArray([]);
    router
      .push(`/groups/${group?.id}`)
      .then(() => resetState())
      .catch(console.error);
  }

  function addExpense() {
    const { group, paidBy, splitType, fileKey, canSplitScreenClosed } =
      useAddExpenseStore.getState();
    if (!paidBy) {
      return;
    }

    if (!canSplitScreenClosed) {
      setSplitScreenOpen(true);
      return;
    }

    if (group) {
      addGroupExpenseMutation.mutate(
        {
          ...returnMutateObject({
            name: description,
            currency,
            amount,
            paidBy: paidBy.id,
            expenseDate,
            transactionId: transactionId,
            participants: participants,
          }),
          groupId: group.id,
          splitType,
          participants: participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0,
          })),
          paidBy: paidBy.id,
          category,
          fileKey,
          expenseDate,
          expenseId,
        },
        {
          onSuccess: (d) => {
            if (d) {
              router
                .push(`/groups/${group.id}`)
                .then(() => resetState())
                .catch(console.error);
            }
          },
        },
      );
    } else {
      addExpenseMutation.mutate(
        {
          ...returnMutateObject({
            name: description,
            currency,
            amount,
            paidBy: paidBy.id,
            expenseDate,
            transactionId: transactionId,
            participants: participants,
          }),
          expenseId,
          category,
          fileKey,
        },
        {
          onSuccess: (d) => {
            if (participants[1] && d) {
              router
                .push(`/balances/${participants[1]?.id}`)
                .then(() => resetState())
                .catch(console.error);
            }
          },
        },
      );
    }
  }

  const CategoryIcon = CategoryIcons[category] ?? Banknote;

  const addViaGoCardless = (obj: TransactionAddInputModel) => {
    setExpenseDate(obj.date);
    setDescription(obj.description);
    setCurrency(obj.currency);
    onUpdateAmount(obj.amount);
    setTransactionId(obj.transactionId ?? '');
  };

  const clearFields = () => {
    setAmount(0);
    setDescription('');
    setAmountStr('');
    setExpenseDate(new Date());
  };

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center justify-between">
          {participants.length === 1 ? (
            <Link href="/balances">
              <Button onClick={clearFields} variant="ghost" className=" px-0 text-primary">
                {t('cancel')}
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" className=" px-0 text-primary" onClick={resetState}>
              {t('cancel')}
            </Button>
          )}
          <div className="text-center">{t('add_expense')}</div>
          <Button
            variant="ghost"
            className=" px-0 text-primary"
            disabled={
              addExpenseMutation.isLoading ||
              addGroupExpenseMutation.isLoading ||
              !amount ||
              description === '' ||
              isFileUploading
            }
            onClick={addExpense}
          >
            {t('save')}
          </Button>{' '}
        </div>
        <UserInput isEditing={!!expenseId} />
        {showFriends || (participants.length === 1 && !group) ? (
          <SelectUserOrGroup enableSendingInvites={enableSendingInvites} />
        ) : (
          <>
            <div className="mt-10 flex gap-2">
              <AppDrawer
                trigger={
                  <div className="flex w-[70px] justify-center rounded-lg border py-2">
                    <CategoryIcon size={20} />
                  </div>
                }
                title={t('expense_categories')}
                className="h-[70vh]"
                shouldCloseOnAction
              >
                <div>
                  {Object.entries(categories).map(([categoryName, categoryDetails]) => {
                    return (
                      <div key={categoryName} className="mb-8">
                        <h3 className="mb-4 text-lg font-semibold">{categoryDetails.name}</h3>
                        <div className="flex flex-wrap justify-between gap-2">
                          {categoryDetails.items.map((item) =>
                            Object.entries(item).map(([key, value]) => {
                              const Icon =
                                CategoryIcons[key] ?? CategoryIcons[categoryName] ?? Banknote;
                              return (
                                <DrawerClose key={key}>
                                  <Button
                                    variant="ghost"
                                    className="flex w-[75px] flex-col gap-1 py-8 text-center"
                                    onClick={() => {
                                      setCategory(key === 'other' ? categoryName : key);
                                    }}
                                  >
                                    <span className="block text-2xl">
                                      <Icon />
                                    </span>
                                    <span className="block text-xs capitalize">{value}</span>
                                  </Button>
                                </DrawerClose>
                              );
                            }),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AppDrawer>
              <Input
                placeholder={t('expense_description_placeholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value.toString() ?? '')}
                className="text-lg placeholder:text-sm"
              />
            </div>
            <div className="flex gap-2">
              <AppDrawer
                trigger={
                  <div className="flex w-[70px] justify-center rounded-lg border py-2  text-center text-base">
                    {currency ?? 'USD'}
                  </div>
                }
                onTriggerClick={() => setOpen(true)}
                title={t('expense_select_currency')}
                className="h-[70vh]"
                shouldCloseOnAction
                open={open}
                onOpenChange={(openVal) => {
                  if (openVal !== open) setOpen(openVal);
                }}
              >
                <div>
                  <Command className="h-[50vh]">
                    <CommandInput className="text-lg" placeholder={t('expense_currency_search')} />
                    <CommandEmpty>{t('expense_currency_notfound')}.</CommandEmpty>
                    <CommandGroup className="h-full overflow-auto">
                      {CURRENCIES.map((framework) => (
                        <CommandItem
                          key={`${framework.code}-${framework.name}`}
                          value={`${framework.code}-${framework.name}`}
                          onSelect={(currentValue) => {
                            const _currency = currentValue.split('-')[0]?.toUpperCase() ?? 'USD';
                            updateProfile.mutate({ currency: _currency });

                            setCurrency(_currency);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              `${framework.code}-${framework.name.toLowerCase()}`.startsWith(
                                currency,
                              )
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <div className="flex gap-2">
                            <p>{framework.name}</p>
                            <p className=" text-muted-foreground">{framework.code}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </div>
              </AppDrawer>

              <Input
                placeholder={t('expense_amount_placeholder')}
                className="text-lg placeholder:text-sm"
                type="text"
                inputMode="decimal"
                value={amtStr}
                onChange={(e) => onUpdateAmount(e.target.value)}
              />
            </div>
            {!amount || description === '' ? (
              <div className="h-[40px]"></div>
            ) : (
              <div className="h-[180px]">
                <SplitTypeSection />

                <div className="mt-4 flex  items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            ' justify-start px-0 text-left font-normal',
                            !expenseDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-6 w-6 text-cyan-500" />
                          {expenseDate ? (
                            format(expenseDate, 'yyyy-MM-dd') ===
                            format(new Date(), 'yyyy-MM-dd') ? (
                              t('today')
                            ) : (
                              format(expenseDate, 'MMM dd')
                            )
                          ) : (
                            <span>{t('expense_date')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={expenseDate}
                          onSelect={setExpenseDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-4">
                    {isStorageConfigured ? <UploadFile /> : null}

                    <Button
                      className=" min-w-[100px]"
                      size="sm"
                      loading={
                        addExpenseMutation.isLoading ||
                        addGroupExpenseMutation.isLoading ||
                        isFileUploading
                      }
                      disabled={
                        addExpenseMutation.isLoading ||
                        addGroupExpenseMutation.isLoading ||
                        !amount ||
                        description === '' ||
                        isFileUploading
                      }
                      onClick={() => addExpense()}
                    >
                      {t('submit')}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-4">
                  <Button variant="ghost" className=" px-0 text-primary" onClick={clearFields}>
                    {t('clear')}
                  </Button>
                </div>
              </div>
            )}
            {group && (
              <GoCardlessTransactions
                add={addViaGoCardless}
                addMultipleExpenses={addMultipleExpenses}
                multipleArray={multipleArray}
                setMultipleArray={(a: TransactionAddInputModel[]) => {
                  clearFields();
                  setMultipleArray(a);
                }}
              />
            )}
            <div className=" flex w-full justify-center">
              <Link
                href="https://github.com/sponsors/KMKoushik"
                target="_blank"
                className="mx-auto"
              >
                <Button
                  variant="outline"
                  className="text-md  justify-between rounded-full border-pink-500 hover:text-foreground/80"
                >
                  <div className="flex items-center gap-4">
                    <HeartHandshakeIcon className="h-5 w-5 text-pink-500" />
                    Sponsor us
                  </div>
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};

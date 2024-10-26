import { api } from '~/utils/api';
import { LoadingSpinner } from '../ui/spinner';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { type TransactionAddInputModel } from './AddExpensePage';
import { env } from '~/env';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { type SingleTransactionType } from '~/server/api/routers/gocardless';

type Props = {
  add: (obj: TransactionAddInputModel) => void;
  addMultipleExpenses: () => void;
  multipleArray: TransactionAddInputModel[];
  setMultipleArray: (a: TransactionAddInputModel[]) => void;
};

type SingleTransactionTemp = {
  bookingDate: string;
  remittanceInformationUnstructured: string;
  transactionId: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  pending: boolean;
};

export const GoCardlessTransactions = ({
  add,
  addMultipleExpenses,
  multipleArray,
  setMultipleArray,
}: Props) => {
  const userQuery = api.user.me.useQuery();
  const gctransactions = api.gocardless.getTransactions.useQuery(userQuery.data?.gocardlessId);

  const expensesQuery = api.user.getOwnExpenses.useQuery();

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const returnTransactionsArray = (): SingleTransactionTemp[] => {
    const transactions = gctransactions?.data?.transactions;
    if (!transactions) return [];

    const mapTransactions = (items: SingleTransactionType[], pendingStatus: boolean) =>
      items?.map((cItem) => ({ ...cItem, pending: pendingStatus })) || [];

    const pending = mapTransactions(transactions.pending, true);
    const booked = mapTransactions(transactions.booked, false);

    return [...pending, ...booked];
  };

  const alreadyAdded = (transactionId: string) =>
    expensesQuery?.data?.some((item) => item.transactionId === transactionId) ?? false;

  const returnGroupName = (transactionId: string) => {
    const transaction = expensesQuery?.data?.find((item) => item.transactionId === transactionId);
    return transaction?.group?.name ? ` ${t('to')} ${transaction.group.name}` : '';
  };

  if (!env.NEXT_PUBLIC_GOCARDLESS_ENABLED) {
    return <></>;
  }

  const transactionsArray = returnTransactionsArray();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p>{t('bank_transactions')}</p>
        <Button
          variant="ghost"
          className=" px-0 text-primary"
          disabled={(multipleArray?.length || 0) === 0}
          onClick={addMultipleExpenses}
        >
          {t('submit_all')}
        </Button>
      </div>
      {gctransactions.isInitialLoading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="text-primary" />
        </div>
      ) : (
        <>
          {transactionsArray?.length === 0 && (
            <div className="mt-[30vh] text-center text-gray-400">{t('no_transactions_yet')}</div>
          )}
          {transactionsArray
            ?.filter((item) => item.transactionAmount.amount.includes('-'))
            .map((item, index) => (
              <div className="flex items-center justify-between px-2 py-2" key={index}>
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={multipleArray?.some(
                      (cItem) => cItem.transactionId === item.transactionId,
                    )}
                    disabled={alreadyAdded(item.transactionId)}
                    onCheckedChange={() => {
                      if (
                        multipleArray?.some((cItem) => cItem.transactionId === item.transactionId)
                      ) {
                        setMultipleArray(
                          multipleArray.filter(
                            (cItem) => cItem.transactionId !== item.transactionId,
                          ),
                        );
                      } else {
                        setMultipleArray([
                          ...multipleArray,
                          {
                            date: new Date(item.bookingDate),
                            amount: item.transactionAmount.amount.replace('-', ''),
                            currency: item.transactionAmount.currency,
                            description: item.remittanceInformationUnstructured,
                            transactionId: item.transactionId,
                          },
                        ]);
                      }
                    }}
                  />
                  <button
                    className="flex items-center gap-4"
                    disabled={alreadyAdded(item.transactionId)}
                    onClick={() => {
                      add({
                        date: new Date(item.bookingDate),
                        amount: item.transactionAmount.amount.replace('-', ''),
                        currency: item.transactionAmount.currency,
                        description: item.remittanceInformationUnstructured,
                        transactionId: item.transactionId,
                      });
                      document
                        .getElementById('mainlayout')
                        ?.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                  >
                    <div className="text-xs text-gray-500">
                      {format(item.bookingDate, 'MMM dd')
                        .split(' ')
                        .map((d) => (
                          <div className="text-center" key={d}>
                            {d}
                          </div>
                        ))}
                    </div>
                    <div>
                      <p
                        className={
                          'line-clamp-2 max-w-[200px] text-left text-sm lg:max-w-lg lg:text-base' +
                          (alreadyAdded(item.transactionId) ? ' line-through' : '')
                        }
                      >
                        {item.remittanceInformationUnstructured}
                      </p>
                      <p className={`flex text-center text-xs text-gray-500`}>
                        {item.pending && t('pending')}{' '}
                        {alreadyAdded(item.transactionId) &&
                          `(${t('already_added')}${returnGroupName(item.transactionId)})`}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="min-w-10 shrink-0">
                  <div
                    className={`text-right ${alreadyAdded(item.transactionId) ? 'text-red-500' : 'text-emerald-600'}`}
                  >
                    <span className="font-light ">{item.transactionAmount.currency}</span>{' '}
                    {item.transactionAmount.amount}
                  </div>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
};

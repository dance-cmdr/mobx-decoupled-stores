import { types, getEnv, flow } from 'mobx-state-tree';
import 'babel-polyfill';
import { Subject, Observable } from 'rxjs';
import { multicast, filter } from 'rxjs/operators';

const RemindersService = (auth) => {
  const log$ = new Subject();
  const events$ = new Observable().pipe(multicast(log$));
  return {
    events$,
    load: () => {
      log$.next({
        service: 'reminders',
        action: 'load',
        status: 'pending',
        messageKey: 'reminders-load-pending',
        date: Date.now(),
      });

      const result = Promise.resolve([{ id: '1' }, { id: '1' }, { id: '1' }]);

      result.then((body) =>
        log$.next({
          service: 'reminders',
          action: 'load',
          status: 'success',
          messageKey: 'reminders-load-success',
          date: Date.now(),
          body,
        })
      );

      result.catch((body) =>
        log$.next({
          service: 'reminders',
          action: 'load',
          status: 'error',
          messageKey: 'reminders-load-error',
          date: Date.now(),
          body,
        })
      );

      return result;
    },
  };
};

const Reminder = types.model('Reminder', {
  id: types.string,
});

const RemindersStore = types
  .model('Reminders', {
    reminders: types.array(Reminder),
  })
  .actions((self) => {
    const load = flow(function* () {
      const { service } = getEnv(self);
      const reminders = yield service.load();
      self.reminders = reminders;
    });

    return {
      load,
    };
  });

const AuthStore = types.model('Auth', {
  token: types.string,
});

const Notification = types.model('');

const NotificationStore = types
  .model('Notification', {
    notifications: types.array(Notification),
  })
  .actions((self) => ({
    showNotification(notification) {
      self.notifications.push(notification);
    },
  }));

describe('decoupled stores', () => {
  it('return ', async () => {
    const notifications = NotificationStore.create();
    const auth = AuthStore.create({ token: 'token' });
    const service = RemindersService(auth);
    const store = RemindersStore.create({}, { service });

    // notification connection
    service.events$
      .pipe(
        filter((value) => ['success', 'failure'].indexOf(value.status) > -1)
      )
      .subscribe(notifications.showNotification);

    await store.load();
    expect(store.reminders).toHaveLength(3);
    expect(notifications.notifications).toHaveLength(1);
  });
});

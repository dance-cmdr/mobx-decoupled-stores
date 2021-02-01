import { types, getEnv, flow, getSnapshot, addDisposer } from 'mobx-state-tree';
import { reaction } from 'mobx';
import 'babel-polyfill';

const defaultApplicationState = (appState = {}) =>
  Object.assign(
    {},
    {
      lists: [
        {
          id: '0',
          items: [
            {
              id: '0-0',
              autoplay: true,
            },
            {
              id: '0-1',
              autoplay: true,
            },
            {
              id: '0-2',
              autoplay: true,
            },
          ],
        },
        {
          id: '1',
          items: [
            {
              id: '1-0',
              autoplay: true,
            },
            {
              id: '1-1',
              autoplay: false,
            },
            {
              id: '1-2',
              autoplay: true,
            },
          ],
        },
      ],
      selection: {
        item: 0,
        list: 0,
      },
    },
    appState
  );

/***
 * This is a showcase on how an MST tree should look like.
 * For example I'm using a case of interval list item selection.
 * Similar to many practical application such as automated carousel and Youtube play next. (e.g. Continuous Play)
 */

const ItemStore = types.model('ItemStore', {
  id: types.string,
  autoplay: types.boolean,
});

const ListStore = types.model('ListStore', {
  id: types.string,
  items: types.array(ItemStore, []),
});

const SelectionStore = types
  .model('SelectionStore', {
    pendingId: types.optional(types.string, ''),
    list: types.optional(types.number, 0),
    item: types.optional(types.number, 0),
  })
  .actions((self) => ({
    afterCreate() {
      const selectionReactor = reaction(
        () => ({
          listIndex: self.list,
          itemIndex: self.item,
        }),
        () => {
          self.clearPendingId();
        }
      );
      addDisposer(self, selectionReactor);
    },
    setPendingId(id) {
      self.pendingId = id;
    },
    clearPendingId() {
      self.pendingId = null;
    },
    setSelection({ listIndex, itemIndex }) {
      self.list = listIndex;
      self.item = itemIndex;
    },
  }));

const RootStore = types
  .model('RootStore', {
    lists: types.array(ListStore),
    selection: SelectionStore,
  })
  .views((self) => ({
    get activeItem() {
      try {
        const currentList = self.selection.list;
        const currentItem = self.selection.item;

        return getSnapshot(self.lists[currentList].items[currentItem]);
      } catch (error) {
        console.log(error);
      }
      return null;
    },
    get nextPlayableItem() {
      try {
        const currentListIndex = self.selection.list;
        const currentItemIndex = self.selection.item;

        for (let li = currentListIndex; li < self.lists.length; li++) {
          // delete this bracket if you don't fancy searching all the lists
          const startingItemIndex =
            li > currentListIndex ? 0 : currentItemIndex;

          for (
            let ii = startingItemIndex + 1;
            ii < self.lists[li].items.length;
            ii++
          ) {
            const item = getSnapshot(self.lists[li].items[ii]);
            if (item.autoplay) {
              return item;
            }
          }
        }
      } catch (error) {
        console.log(error);
      }

      return null;
    },
  }));

/***
 * Tests
 */
describe('MST Tree', () => {
  describe('root', () => {
    describe('activeItem', () => {
      describe('WHEN the app starts with default state', () => {
        it('should return the first item', () => {
          const root = RootStore.create(defaultApplicationState());
          expect(root.activeItem).toEqual({ id: '0-0', autoplay: true });
        });
      });

      describe('WHEN the app starts with selection', () => {
        it('should return the specified selection', () => {
          const appState = {
            selection: {
              list: 1,
              item: 2,
            },
          };
          const root = RootStore.create(defaultApplicationState(appState));
          expect(root.activeItem).toEqual({ id: '1-2', autoplay: true });
        });
      });
    });

    describe('nextPlayableItem', () => {
      it('should return the second item of the first list', () => {
        const root = RootStore.create(defaultApplicationState());
        expect(root.nextPlayableItem).toEqual({ id: '0-1', autoplay: true });
      });

      it('should skip the second item of the second list and return the third', () => {
        const appState = {
          selection: {
            list: 1,
            item: 0,
          },
        };
        const root = RootStore.create(defaultApplicationState(appState));
        expect(root.nextPlayableItem).toEqual({ id: '1-2', autoplay: true });
      });

      describe('WHEN there are no playable items left after the cursor', () => {
        it('should return null', () => {
          const appState = {
            selection: {
              list: 1,
              item: 2,
            },
          };
          const root = RootStore.create(defaultApplicationState(appState));
          expect(root.nextPlayableItem).toEqual(null);
        });
      });
    });

    describe('WHEN the app is initialised with an item.id but it has empty lists (deeplinking)', () => {});
  });
});

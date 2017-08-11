/* @flow */

import sleep from 'delay';
import { MessengerClient } from 'messaging-api-messenger';

import type { MessengerSession } from '../bot/MessengerConnector';

import { DEFAULT_MESSAGE_DELAY, type Context } from './Context';
import MessengerEvent, { type MessengerRawEvent } from './MessengerEvent';
import DelayableJobQueue from './DelayableJobQueue';

type Options = {
  client: MessengerClient,
  rawEvent: MessengerRawEvent,
  session: MessengerSession,
};

class MessengerContext implements Context {
  _client: MessengerClient;
  _event: MessengerEvent;
  _session: MessengerSession;
  _jobQueue: DelayableJobQueue;

  constructor({ client, rawEvent, session }: Options) {
    this._client = client;
    this._event = new MessengerEvent(rawEvent);
    this._session = session;
    this._jobQueue = new DelayableJobQueue();
    this._jobQueue.beforeEach(async ({ delay, showIndicators = true }) => {
      if (showIndicators) {
        this.turnTypingIndicatorsOn();
      }
      await sleep(delay);
    });
    this._jobQueue.after(async ({ showIndicators = true }) => {
      if (showIndicators) {
        this.turnTypingIndicatorsOff();
      }
    });
  }

  get platform(): string {
    return 'messenger';
  }

  get event(): MessengerEvent {
    return this._event;
  }

  get session(): MessengerSession {
    return this._session;
  }

  sendText(text: string): Promise<any> {
    return this._enqueue({
      instance: this._client,
      method: 'sendText',
      args: [this._session.user.id, text],
      delay: DEFAULT_MESSAGE_DELAY,
      showIndicators: true,
    });
  }

  sendTextWithDelay(delay: number, text: string): Promise<any> {
    return this._enqueue({
      instance: this._client,
      method: 'sendText',
      args: [this._session.user.id, text],
      delay,
      showIndicators: true,
    });
  }

  // FIXME: rethink
  sendTextTo(id: string, text: string): Promise<any> {
    return this._enqueue({
      instance: this._client,
      method: 'sendText',
      args: [id, text],
      delay: 0,
      showIndicators: false,
    });
  }

  turnTypingIndicatorsOn(): void {
    this._client.turnTypingIndicatorsOn(this._session.user.id);
  }

  turnTypingIndicatorsOff(): void {
    this._client.turnTypingIndicatorsOff(this._session.user.id);
  }

  _enqueue(job: Object): Promise<any> {
    return new Promise((resolve, reject) => {
      this._jobQueue.enqueue({
        ...job,
        onSuccess: resolve,
        onError: reject,
      });
    });
  }
}

const sendMethods = [
  'sendIssueResolutionText',
  'sendImage',
  'sendAudio',
  'sendVideo',
  'sendFile',
  'sendQuickReplies',
  'sendGenericTemplate',
  'sendShippingUpdateTemplate',
  'sendReservationUpdateTemplate',
  'sendIssueResolutionTemplate',
  'sendButtonTemplate',
  'sendListTemplate',
  'sendReceiptTemplate',
  'sendAirlineBoardingPassTemplate',
  'sendAirlineCheckinTemplate',
  'sendAirlineItineraryTemplate',
  'sendAirlineFlightUpdateTemplate',
];

sendMethods.forEach(method => {
  Object.defineProperty(MessengerContext.prototype, `${method}`, {
    enumerable: false,
    configurable: true,
    writable: true,
    value(...args) {
      return this._enqueue({
        instance: this._client,
        method,
        args: [this._session.user.id, ...args],
        delay: DEFAULT_MESSAGE_DELAY,
        showIndicators: true,
      });
    },
  });

  Object.defineProperty(MessengerContext.prototype, `${method}To`, {
    enumerable: false,
    configurable: true,
    writable: true,
    value(id, ...rest) {
      return this._enqueue({
        instance: this._client,
        method,
        args: [id, ...rest],
        delay: 0,
        showIndicators: false,
      });
    },
  });

  Object.defineProperty(MessengerContext.prototype, `${method}WithDelay`, {
    enumerable: false,
    configurable: true,
    writable: true,
    value(delay, ...rest) {
      return this._enqueue({
        instance: this._client,
        method,
        args: [this._session.user.id, ...rest],
        delay,
        showIndicators: true,
      });
    },
  });
});

export default MessengerContext;
